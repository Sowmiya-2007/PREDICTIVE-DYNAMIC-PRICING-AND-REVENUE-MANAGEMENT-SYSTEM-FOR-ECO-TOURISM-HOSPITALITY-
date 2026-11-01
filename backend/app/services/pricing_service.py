import datetime
import logging
import numpy as np
from app.config import Config
from app.database import db_session
from app.models import (
    Property, RoomType, RoomInventory, LocalEvent,
    DemandPrediction, PricingRecommendation, PriceHistory, AuditLog, User,
    DataSourceStatus
)
from app.ml.feature_engineering import construct_feature_vector
from app.ml.multi_model import global_multi_model, MODEL_DISPLAY_NAMES
from app.services.weather_service import WeatherService

logger = logging.getLogger(__name__)

class PricingEngineService:
    @staticmethod
    def generate_recommendation(
        property_id: int,
        room_type_id: int,
        target_date: datetime.date,
        model_name: str = None,
        user_id: int = None
    ):
        """
        Calculate dynamic pricing recommendation based on ML demand forecast,
        local event proximity, seasonality, Open-Meteo weather, and configurable business bounds.
        Integrates SHAP explanations and separates statistical demand prediction from pricing rules.
        """
        property_obj = db_session.query(Property).filter_by(id=property_id).first()
        if not property_obj:
            raise ValueError(f"Property with ID {property_id} not found.")

        room_type_obj = db_session.query(RoomType).filter_by(id=room_type_id, property_id=property_id).first()
        if not room_type_obj:
            raise ValueError(f"Room type with ID {room_type_id} not found for property.")

        # Determine current inventory price for target date or fall back to room type base price
        inv_record = db_session.query(RoomInventory).filter_by(
            property_id=property_id,
            room_type_id=room_type_id,
            inventory_date=target_date
        ).first()

        current_price = inv_record.current_price if inv_record else room_type_obj.base_price
        base_price = room_type_obj.base_price
        min_price = room_type_obj.min_price or property_obj.min_price
        max_price = room_type_obj.max_price or property_obj.max_price
        total_rooms = room_type_obj.total_rooms

        # Check data source freshness / stale warning
        weather_ds = db_session.query(DataSourceStatus).filter_by(source_id='open_meteo_weather').first()
        is_stale_data = bool(weather_ds and weather_ds.is_stale())

        # Fetch relevant local events & real weather observation/forecast
        active_events = db_session.query(LocalEvent).filter(LocalEvent.status != 'cancelled').all()
        weather_obs = WeatherService.get_weather_for_date(property_obj.location, target_date, property_id=property_id)

        # Current occupancy percentage for that day if inventory exists
        current_occ = (inv_record.booked_rooms / total_rooms * 100.0) if (inv_record and total_rooms > 0) else 45.0

        # Construct ML feature vector
        lead_time = max(1, (target_date - datetime.date.today()).days)
        feature_dict, vector, _ = construct_feature_vector(
            target_date=target_date,
            property_obj=property_obj,
            room_type_obj=room_type_obj,
            active_events=active_events,
            lead_time_days=lead_time,
            current_occupancy_pct=current_occ,
            weather_dict=weather_obs
        )

        # ----------------------------------------------------
        # 1. Machine Learning Direct Room-Price Prediction (Model Layer)
        # ----------------------------------------------------
        chosen_model_key = model_name or Config.DEFAULT_PREDICTION_MODEL
        model_pred_price, all_model_preds, confidence, model_used = global_multi_model.predict(
            feature_dict, model_name=chosen_model_key
        )
        model_display = MODEL_DISPLAY_NAMES.get(model_used, model_used)

        # Compute real SHAP explanation in Rupees for this specific room price prediction
        shap_explanation = global_multi_model.explain_prediction(feature_dict, model_name=model_used)

        # Store demand & price prediction record
        est_booked_rooms = float(np.clip(round((feature_dict['current_occupancy_pct'] / 100.0) * total_rooms, 1), 1.0, total_rooms))
        prediction_rec = DemandPrediction(
            property_id=property_id,
            room_type_id=room_type_id,
            target_date=target_date,
            predicted_demand=est_booked_rooms,
            predicted_occupancy_rate=feature_dict['current_occupancy_pct'],
            predicted_price=model_pred_price,
            all_model_prices=all_model_preds,
            confidence_score=confidence,
            influencing_factors=feature_dict,
            model_version=global_multi_model.version
        )
        db_session.add(prediction_rec)

        # ----------------------------------------------------
        # 2. Transparent Business Pricing Rules Layer (Separate Layer)
        # ----------------------------------------------------
        pricing_rule_steps = []
        raw_model_price = float(model_pred_price)
        pricing_rule_steps.append(
            f"1. Machine Learning Inference: {model_display} directly predicted a room price of ₹{raw_model_price:.0f} based on 19 multi-factor features."
        )

        # Reference price for volatility bounding
        reference_price = current_price if current_price > 0 else base_price

        # A. Maximum Permitted Price Change Guardrail (Volatility Clamp)
        max_pct = Config.MAX_PRICE_CHANGE_PCT or 30.0
        lower_bound = reference_price * (1.0 - (max_pct / 100.0))
        upper_bound = reference_price * (1.0 + (max_pct / 100.0))
        bounded_price = float(np.clip(raw_model_price, lower_bound, upper_bound))

        if bounded_price != raw_model_price:
            pricing_rule_steps.append(
                f"2. Rate Volatility Guardrail: Model price ₹{raw_model_price:.0f} adjusted to ₹{bounded_price:.0f} (clamped to ±{max_pct:.0f}% max volatility vs current ₹{reference_price:.0f})."
            )
        else:
            pricing_rule_steps.append(
                f"2. Rate Volatility Guardrail: Passed (model price ₹{raw_model_price:.0f} is within ±{max_pct:.0f}% permitted adjustment)."
            )

        # B. Sanctuary Minimum Floor (min_price) and Maximum Ceiling (max_price) Enforcement
        min_enforced = False
        max_enforced = False
        final_price = bounded_price

        if final_price < min_price:
            final_price = min_price
            min_enforced = True
            pricing_rule_steps.append(f"3. Price Floor Enforced: Raised to sanctuary minimum rate ₹{min_price:.0f}.")
        elif final_price > max_price:
            final_price = max_price
            max_enforced = True
            pricing_rule_steps.append(f"3. Price Ceiling Enforced: Capped at maximum permitted sanctuary rate ₹{max_price:.0f} to safeguard guest trust.")
        else:
            pricing_rule_steps.append(f"3. Sanctuary Rate Boundaries: ₹{final_price:.0f} satisfies property corridor [₹{min_price:.0f} - ₹{max_price:.0f}].")

        # Round to nearest 10
        final_price = max(round(final_price, -1), 500.0)

        abs_diff = round(final_price - current_price, 2)
        pct_diff = round(((final_price - current_price) / current_price) * 100.0, 1) if current_price > 0 else 0.0

        # Synthesize plain-language rationale clearly distinguishing model prediction from recommended price
        rationale_parts = [
            f"Direct ML Price: ₹{raw_model_price:.0f} predicted by {model_display} (Confidence: {int(confidence*100)}%).",
            f"Final Rule-Adjusted Recommendation: ₹{final_price:.0f}."
        ]
        if abs_diff > 0:
            rationale_parts.append(f"Recommended upward adjustment of +₹{abs_diff:.0f} (+{pct_diff:.1f}%) to capture strong willingness to pay.")
        elif abs_diff < 0:
            rationale_parts.append(f"Recommended reduction of -₹{abs(abs_diff):.0f} ({pct_diff:.1f}%) to stimulate bookings.")
        else:
            rationale_parts.append("Current inventory rate aligns with market equilibrium.")

        if is_stale_data:
            rationale_parts.append("[Warning: Upstream weather data was older than refresh interval at computation time.]")

        full_rationale = " ".join(rationale_parts)
        rules_explanation = "\n".join(pricing_rule_steps)

        recommendation = PricingRecommendation(
            property_id=property_id,
            room_type_id=room_type_id,
            target_date=target_date,
            current_price=current_price,
            model_predicted_price=raw_model_price,
            all_model_predictions=all_model_preds,
            recommended_price=final_price,
            absolute_diff=abs_diff,
            percent_diff=pct_diff,
            predicted_demand=est_booked_rooms,
            predicted_occupancy=feature_dict['current_occupancy_pct'],
            demand_multiplier=round(final_price / reference_price, 3) if reference_price > 0 else 1.0,
            event_impact_factor=float(feature_dict.get('event_intensity_score', 1.0)),
            seasonal_factor=float(feature_dict.get('seasonal_demand_weight', 1.0)),
            rationale=full_rationale,
            pricing_rules_explanation=rules_explanation,
            min_price_enforced=min_enforced,
            max_price_enforced=max_enforced,
            model_version=global_multi_model.version,
            selected_model_name=model_display,
            confidence_score=confidence,
            shap_values=shap_explanation,
            is_stale_data_warning=is_stale_data,
            status='pending'
        )

        db_session.add(recommendation)
        db_session.commit()

        # If auto-pricing is explicitly enabled and authorized, auto-apply
        if Config.ENABLE_AUTO_PUBLIC_PRICING and user_id:
            user_obj = db_session.query(User).filter_by(id=user_id).first()
            if user_obj and user_obj.role in ['hospitality_manager', 'administrator']:
                PricingEngineService.approve_recommendation(recommendation.id, user_obj)

        return recommendation

    @staticmethod
    def approve_recommendation(recommendation_id: int, user: User, override_price: float = None):
        """
        Approve recommendation or override with custom price, apply to room inventory,
        and record full audit trail.
        """
        rec = db_session.query(PricingRecommendation).filter_by(id=recommendation_id).first()
        if not rec:
            raise ValueError(f"Recommendation {recommendation_id} not found.")

        final_price = float(override_price) if override_price is not None else rec.recommended_price
        prop = rec.property

        # Strict boundary validation
        if final_price < prop.min_price or final_price > prop.max_price:
            raise ValueError(f"Price ₹{final_price} must be within bounds [₹{prop.min_price}, ₹{prop.max_price}].")

        rec.status = 'applied'
        rec.reviewed_by_id = user.id
        rec.reviewed_at = datetime.datetime.utcnow()
        if override_price is not None:
            rec.override_price = final_price

        # Update or create RoomInventory record
        inv = db_session.query(RoomInventory).filter_by(
            property_id=rec.property_id,
            room_type_id=rec.room_type_id,
            inventory_date=rec.target_date
        ).first()

        old_price = rec.current_price
        if inv:
            old_price = inv.current_price
            inv.current_price = final_price
        else:
            inv = RoomInventory(
                property_id=rec.property_id,
                room_type_id=rec.room_type_id,
                inventory_date=rec.target_date,
                total_rooms=rec.room_type.total_rooms,
                available_rooms=rec.room_type.total_rooms,
                booked_rooms=0,
                current_price=final_price
            )
            db_session.add(inv)

        # Price History Record
        history = PriceHistory(
            property_id=rec.property_id,
            room_type_id=rec.room_type_id,
            date_applied=rec.target_date,
            old_price=old_price,
            new_price=final_price,
            change_type='manual_override' if override_price is not None else 'recommendation_applied',
            recommendation_id=rec.id,
            changed_by_id=user.id,
            reason=f"Approved recommendation {rec.id} using model {rec.selected_model_name} (override: {override_price is not None})"
        )
        db_session.add(history)

        # Audit Log
        audit = AuditLog(
            user_id=user.id,
            action='PRICE_APPROVED_APPLIED',
            entity_type='pricing_recommendation',
            entity_id=rec.id,
            details={
                'property': rec.property.name,
                'room_type': rec.room_type.name,
                'target_date': str(rec.target_date),
                'old_price': old_price,
                'new_price': final_price,
                'model_used': rec.selected_model_name,
                'model_version': rec.model_version,
                'was_overridden': override_price is not None
            }
        )
        db_session.add(audit)
        db_session.commit()
        return rec

    @staticmethod
    def reject_recommendation(recommendation_id: int, user: User, rejection_reason: str):
        """Reject recommendation and record audit log."""
        rec = db_session.query(PricingRecommendation).filter_by(id=recommendation_id).first()
        if not rec:
            raise ValueError(f"Recommendation {recommendation_id} not found.")

        rec.status = 'rejected'
        rec.reviewed_by_id = user.id
        rec.reviewed_at = datetime.datetime.utcnow()
        rec.rejection_reason = rejection_reason or "Declined by hospitality manager."

        audit = AuditLog(
            user_id=user.id,
            action='PRICE_REJECTED',
            entity_type='pricing_recommendation',
            entity_id=rec.id,
            details={'reason': rec.rejection_reason, 'model_version': rec.model_version}
        )
        db_session.add(audit)
        db_session.commit()
        return rec
