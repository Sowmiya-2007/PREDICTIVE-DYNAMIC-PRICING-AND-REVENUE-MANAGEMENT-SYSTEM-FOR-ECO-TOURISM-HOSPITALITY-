import datetime
import random
import logging
from app.database import db_session, init_db, engine, Base
from app.models.user import User
from app.models.property import Property, RoomType, RoomInventory
from app.models.event import LocalEvent, ScrapingRun
from app.models.booking import Booking
from app.models.prediction import DemandPrediction, ModelTrainingRun
from app.models.recommendation import PricingRecommendation, PriceHistory
from app.models.audit import AuditLog
from app.models.weather import WeatherObservation
from app.services.weather_service import WeatherService

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def seed_database():
    logger.info("Initializing database tables...")
    init_db()

    # Clear existing demo records if any
    logger.info("Clearing previous sample records...")
    db_session.query(AuditLog).delete()
    db_session.query(PriceHistory).delete()
    db_session.query(PricingRecommendation).delete()
    db_session.query(DemandPrediction).delete()
    db_session.query(ModelTrainingRun).delete()
    db_session.query(Booking).delete()
    db_session.query(RoomInventory).delete()
    db_session.query(RoomType).delete()
    db_session.query(LocalEvent).delete()
    db_session.query(ScrapingRun).delete()
    db_session.query(Property).delete()
    db_session.query(WeatherObservation).delete()
    db_session.query(User).delete()
    db_session.commit()

    # 1. Users
    logger.info("Seeding users...")
    admin = User(
        username="admin",
        email="admin@ecotourism.org",
        full_name="Aarav Sharma (System Admin)",
        role="administrator",
        is_active=True
    )
    admin.set_password("admin123")

    manager = User(
        username="manager",
        email="manager@ecotourism.org",
        full_name="Priya Varma (Revenue Manager)",
        role="hospitality_manager",
        is_active=True
    )
    manager.set_password("manager123")

    tourist = User(
        username="tourist",
        email="tourist@naturetrail.com",
        full_name="Ananya Sen (Eco Explorer)",
        role="customer",
        phone="+91 98450 12345",
        preferred_destination="Wayanad, Kerala",
        eco_preference="Zero-Waste Rainforest Stays",
        is_active=True
    )
    tourist.set_password("user123")

    db_session.add_all([admin, manager, tourist])
    db_session.flush()

    # 2. Properties
    logger.info("Seeding eco-tourism properties...")
    properties_data = [
        {
            'name': 'Wayanad Canopy Rainforest Eco-Lodge',
            'location': 'Wayanad, Kerala',
            'state_or_region': 'Kerala',
            'description': 'Zero-carbon rainforest sanctuary nestled in evergreen tropical canopies. Powered 100% by solar micro-grid with rainwater collection and native tree-planting initiatives.',
            'eco_category': 'Forest Eco-Lodge',
            'latitude': 11.6854,
            'longitude': 76.1320,
            'base_price': 4200.0,
            'min_price': 2500.0,
            'max_price': 9800.0,
            'total_capacity': 18,
            'sustainability_rating': 4.9,
            'room_types': [
                {'name': 'Canopy Treehouse Villa', 'base_price': 5600.0, 'min_price': 3500.0, 'max_price': 11000.0, 'total_rooms': 6, 'capacity': 2, 'amenities': '360° Forest Balcony, Rain Shower, Solar Power'},
                {'name': 'Bamboo Earth Cottage', 'base_price': 3800.0, 'min_price': 2500.0, 'max_price': 8000.0, 'total_rooms': 12, 'capacity': 3, 'amenities': 'Earthbrick Cooling, Natural Spring Bath, Organic Herbal Garden'}
            ]
        },
        {
            'name': 'Nilgiri Misty Peaks Sanctuary',
            'location': 'Nilgiris, Tamil Nadu',
            'state_or_region': 'Tamil Nadu',
            'description': 'High-altitude organic tea sanctuary adjacent to Shola grasslands. Certified plastic-neutral retreat offering birdwatching trails and native biodiversity regeneration.',
            'eco_category': 'Mountain Sanctuary',
            'latitude': 11.4102,
            'longitude': 76.6950,
            'base_price': 4800.0,
            'min_price': 2800.0,
            'max_price': 10500.0,
            'total_capacity': 20,
            'sustainability_rating': 4.8,
            'room_types': [
                {'name': 'Shola Horizon Suite', 'base_price': 6200.0, 'min_price': 3800.0, 'max_price': 12500.0, 'total_rooms': 8, 'capacity': 2, 'amenities': 'Fireplace, Panoramic Valley Vista, Fair-Trade Tea Corner'},
                {'name': 'Tea Planter Heritage Cottage', 'base_price': 4200.0, 'min_price': 2800.0, 'max_price': 8800.0, 'total_rooms': 12, 'capacity': 4, 'amenities': 'Recycled Wood Interiors, Mountain Brook View'}
            ]
        },
        {
            'name': 'Sundarbans Mangrove Conservation Camp',
            'location': 'Sundarbans, West Bengal',
            'state_or_region': 'West Bengal',
            'description': 'Tidal estuary research lodge on stilted eco-structures. Supports local tiger scout rangers and mangrove afforestation while offering silent solar-boat safaris.',
            'eco_category': 'Mangrove Retreat',
            'latitude': 21.9497,
            'longitude': 89.1833,
            'base_price': 3200.0,
            'min_price': 1900.0,
            'max_price': 7500.0,
            'total_capacity': 14,
            'sustainability_rating': 4.7,
            'room_types': [
                {'name': 'Stilted Estuary Chalet', 'base_price': 3900.0, 'min_price': 2200.0, 'max_price': 8200.0, 'total_rooms': 6, 'capacity': 2, 'amenities': 'High-Tide Deck, Mosquito Mesh Screen, Solar Lanterns'},
                {'name': 'Mangrove Glamping Tent', 'base_price': 2800.0, 'min_price': 1900.0, 'max_price': 6200.0, 'total_rooms': 8, 'capacity': 2, 'amenities': 'Canvas Shade, Eco-Composting Toilet, River Breeze'}
            ]
        },
        {
            'name': 'Coorg Shade-Grown Organic Coffee Retreat',
            'location': 'Coorg, Karnataka',
            'state_or_region': 'Karnataka',
            'description': 'Historic agro-forestry farm retreat surrounded by ancient silver oak and pepper vines. Farm-to-table organic meals and community stream replenishment project.',
            'eco_category': 'Organic Farm Homestay',
            'latitude': 12.3375,
            'longitude': 75.8069,
            'base_price': 3600.0,
            'min_price': 2200.0,
            'max_price': 8500.0,
            'total_capacity': 16,
            'sustainability_rating': 4.85,
            'room_types': [
                {'name': 'Arabica Veranda Cottage', 'base_price': 4400.0, 'min_price': 2600.0, 'max_price': 9000.0, 'total_rooms': 8, 'capacity': 3, 'amenities': 'Private Patio, Estate View, Cold Pressed Coffee Bar'},
                {'name': 'Estate Courtyard Room', 'base_price': 3200.0, 'min_price': 2200.0, 'max_price': 7200.0, 'total_rooms': 8, 'capacity': 2, 'amenities': 'Terracotta Tiles, Natural Cross Ventilation'}
            ]
        }
    ]

    created_properties = []
    created_room_types = []

    for p_data in properties_data:
        rt_data_list = p_data.pop('room_types')
        prop = Property(**p_data, is_active=True)
        db_session.add(prop)
        db_session.flush()
        created_properties.append(prop)

        for rt_data in rt_data_list:
            rt = RoomType(property_id=prop.id, **rt_data)
            db_session.add(rt)
            db_session.flush()
            created_room_types.append(rt)

    # 3. Local Events
    logger.info("Seeding verified local events...")
    today = datetime.date.today()
    sample_events = [
        {
            'title': 'Wayanad Rainforest & Bio-Diversity Festival',
            'location': 'Wayanad, Kerala',
            'event_category': 'festival',
            'start_date': today + datetime.timedelta(days=2),
            'end_date': today + datetime.timedelta(days=6),
            'description': 'Annual celebration of Western Ghats flora, night amphibian walks, and tribal indigenous seed fairs.',
            'expected_footfall': 4800,
            'impact_intensity': 'high',
            'source_name': 'Kerala Eco-Tourism Portal',
            'source_url': 'https://keralatourism.org/events/wayanad-fest',
            'collection_method': 'scraped'
        },
        {
            'title': 'Western Ghats Monsoon Eco-Marathon & Trail Run',
            'location': 'Wayanad, Kerala',
            'event_category': 'eco_marathon',
            'start_date': today + datetime.timedelta(days=12),
            'end_date': today + datetime.timedelta(days=14),
            'description': 'Sustainable half and full trail marathon through evergreen reserves emphasizing zero single-use plastics.',
            'expected_footfall': 6500,
            'impact_intensity': 'peak',
            'source_name': 'Indian Trail Runners Alliance',
            'source_url': 'https://ecotrailrun.org/ghats',
            'collection_method': 'scraped'
        },
        {
            'title': 'Nilgiri Mountain Birdwatching & Orchid Expo',
            'location': 'Nilgiris, Tamil Nadu',
            'event_category': 'birdwatching_fest',
            'start_date': today + datetime.timedelta(days=5),
            'end_date': today + datetime.timedelta(days=8),
            'description': 'Ornithology symposium and guided field trails spotting endangered Nilgiri Laughingthrush and wild epiphytes.',
            'expected_footfall': 3200,
            'impact_intensity': 'medium',
            'source_name': 'Western Ghats Bio-Reserve Bulletin',
            'source_url': 'https://nilgiriwildlife.org/expo',
            'collection_method': 'scraped'
        },
        {
            'title': 'Coorg Organic Coffee Harvest & Agro-Ecology Conclave',
            'location': 'Coorg, Karnataka',
            'event_category': 'harvest_fair',
            'start_date': today + datetime.timedelta(days=9),
            'end_date': today + datetime.timedelta(days=13),
            'description': 'Harvest celebration showcasing biodynamic agriculture, shade coffee cupping, and native Kodava cultural music.',
            'expected_footfall': 3800,
            'impact_intensity': 'high',
            'source_name': 'Kodagu Agro-Tourism Forum',
            'source_url': 'https://coorgtourism.org/harvest',
            'collection_method': 'scraped'
        },
        {
            'title': 'Sundarbans Estuary Tiger Day & Mangrove Carnival',
            'location': 'Sundarbans, West Bengal',
            'event_category': 'cultural',
            'start_date': today + datetime.timedelta(days=18),
            'end_date': today + datetime.timedelta(days=22),
            'description': 'Folk theatre (Bonbibi Pala), youth conservation boat regatta, and honey-gatherers community benefit gala.',
            'expected_footfall': 4200,
            'impact_intensity': 'high',
            'source_name': 'Sundarbans Biosphere Authority',
            'source_url': 'https://sundarbanstourism.gov.in/carnival',
            'collection_method': 'verified_feed'
        }
    ]

    for ev_data in sample_events:
        ev = LocalEvent(**ev_data, is_verified=True)
        db_session.add(ev)

    # Add Scraping Run Log
    scraping_run = ScrapingRun(
        source_name='Kerala Eco-Tourism & Western Ghats Bulletin',
        source_url='https://www.keralatourism.org/event',
        status='success',
        events_collected=len(sample_events),
        duration_seconds=1.42,
        error_message=None
    )
    db_session.add(scraping_run)
    db_session.flush()

    # 4. Room Inventory (-30 days to +45 days)
    logger.info("Generating daily room inventory and booking history...")
    start_inventory = today - datetime.timedelta(days=30)
    
    booking_counter = 1001
    guest_names = [
        "Aditi Sen", "Vikram Malhotra", "Kavita Nair", "Rohan Iyer",
        "Ananya Roy", "Karthik Menon", "Sneha Mukherjee", "Deepak Joshi",
        "Pooja Deshmukh", "Nikhil Chopra", "Tara Swaminathan", "Rahul Kulkarni"
    ]

    for rt in created_room_types:
        prop = rt.property
        for offset in range(75): # 30 days past + 45 days future
            curr_date = start_inventory + datetime.timedelta(days=offset)
            is_past = curr_date < today
            
            # Booking occupancy simulation
            is_weekend = curr_date.weekday() in [4, 5, 6]
            # Probability of booked rooms
            if is_past:
                occ_factor = random.uniform(0.60, 0.95) if is_weekend else random.uniform(0.35, 0.65)
                booked = min(rt.total_rooms, max(1, int(rt.total_rooms * occ_factor)))
            else:
                occ_factor = random.uniform(0.50, 0.85) if is_weekend else random.uniform(0.20, 0.50)
                booked = min(rt.total_rooms, int(rt.total_rooms * occ_factor))

            avail = rt.total_rooms - booked
            inv_price = rt.base_price * (1.15 if is_weekend else 1.0)

            inv = RoomInventory(
                property_id=prop.id,
                room_type_id=rt.id,
                inventory_date=curr_date,
                total_rooms=rt.total_rooms,
                available_rooms=avail,
                booked_rooms=booked,
                current_price=inv_price
            )
            db_session.add(inv)

            # Generate individual bookings for past dates and confirmed future bookings
            if booked > 0 and (is_past or offset < 15):
                num_bookings = min(booked, random.randint(1, 3))
                for _ in range(num_bookings):
                    guest = random.choice(guest_names)
                    nights = random.randint(1, 4)
                    co_date = curr_date + datetime.timedelta(days=nights)
                    price_night = inv_price
                    total_p = price_night * nights
                    b_code = f"ECO-{curr_date.strftime('%y%m')}-{booking_counter}"
                    booking_counter += 1

                    b = Booking(
                        booking_code=b_code,
                        property_id=prop.id,
                        room_type_id=rt.id,
                        guest_name=guest,
                        guest_email=f"{guest.lower().replace(' ', '.')}@example.com",
                        check_in_date=curr_date,
                        check_out_date=co_date,
                        num_guests=random.randint(1, rt.capacity),
                        rooms_booked=1,
                        price_per_night=price_night,
                        total_price=total_p,
                        booking_status='completed' if is_past else 'confirmed',
                        lead_time_days=random.randint(3, 28),
                        booking_date=curr_date - datetime.timedelta(days=random.randint(3, 14))
                    )
                    db_session.add(b)

    # 4b. Seed personalized bookings for tourist demonstration user
    logger.info("Seeding dedicated customer bookings for 'tourist' demo user...")
    w_prop = created_properties[0] # Wayanad
    c_prop = created_properties[3] # Coorg
    
    # Upcoming booking (5 days from now)
    upcoming_in = today + datetime.timedelta(days=5)
    upcoming_out = upcoming_in + datetime.timedelta(days=3)
    tourist_upcoming = Booking(
        booking_code="ECO-RES-7742",
        property_id=w_prop.id,
        room_type_id=w_prop.room_types[0].id,
        user_id=tourist.id,
        guest_name=tourist.full_name,
        guest_email=tourist.email,
        check_in_date=upcoming_in,
        check_out_date=upcoming_out,
        num_guests=2,
        rooms_booked=1,
        price_per_night=5600.0,
        total_price=16800.0,
        special_requests="High canopy floor requested with vegan organic breakfast basket.",
        booking_status='confirmed',
        lead_time_days=12,
        booking_date=today - datetime.timedelta(days=7)
    )

    # Past completed booking (25 days ago)
    past_in = today - datetime.timedelta(days=25)
    past_out = past_in + datetime.timedelta(days=2)
    tourist_past = Booking(
        booking_code="ECO-RES-6109",
        property_id=c_prop.id,
        room_type_id=c_prop.room_types[0].id,
        user_id=tourist.id,
        guest_name=tourist.full_name,
        guest_email=tourist.email,
        check_in_date=past_in,
        check_out_date=past_out,
        num_guests=2,
        rooms_booked=1,
        price_per_night=4400.0,
        total_price=8800.0,
        special_requests="Quiet plantation corner view.",
        booking_status='completed',
        lead_time_days=18,
        booking_date=past_in - datetime.timedelta(days=18)
    )
    db_session.add_all([tourist_upcoming, tourist_past])

    # 5. Machine Learning Training Run
    logger.info("Recording baseline and trained model metadata...")
    model_run = ModelTrainingRun(
        model_name='EcoDemandForecaster',
        version='v1.0-rf',
        algorithm='RandomForestRegressor (100 estimators, max_depth=8)',
        training_records_count=480,
        mae=3.85,
        rmse=5.21,
        r2=0.84,
        baseline_mae=11.60,
        baseline_rmse=15.42,
        features_list=[
            'day_of_week', 'is_weekend', 'month', 'season_index', 'seasonal_demand_weight',
            'has_event', 'event_count', 'max_event_intensity', 'event_intensity_score', 'event_category_code',
            'base_price', 'lead_time_days', 'sustainability_rating', 'total_rooms', 'current_occupancy_pct'
        ],
        hyperparameters={'n_estimators': 100, 'max_depth': 8, 'min_samples_split': 4, 'random_state': 42},
        is_active=True
    )
    db_session.add(model_run)

    # 6. Sample Demand Predictions & Pricing Recommendations
    logger.info("Seeding pricing recommendations and predictions...")
    rec_dates = [today + datetime.timedelta(days=i) for i in [1, 2, 3, 5, 8, 12, 14]]
    
    for idx, r_date in enumerate(rec_dates):
        for prop in created_properties[:2]:
            rt = prop.room_types[0]
            pred_occ = random.uniform(68.0, 92.0) if idx in [0, 1, 5, 6] else random.uniform(38.0, 58.0)
            pred_rooms = round((pred_occ / 100.0) * rt.total_rooms, 1)

            pred = DemandPrediction(
                property_id=prop.id,
                room_type_id=rt.id,
                target_date=r_date,
                predicted_demand=pred_rooms,
                predicted_occupancy_rate=pred_occ,
                confidence_score=0.89,
                influencing_factors={'has_event': idx < 3, 'is_weekend': r_date.weekday() in [4, 5, 6]},
                model_version='v1.0-rf'
            )
            db_session.add(pred)

            curr_price = rt.base_price
            if pred_occ > 75:
                rec_price = round(curr_price * 1.25, -1)
                rationale = f"High predicted demand ({pred_occ:.1f}%). Local festival surge and weekend clustering warrant +25% dynamic rate."
            elif pred_occ < 45:
                rec_price = round(curr_price * 0.88, -1)
                rationale = f"Low occupancy forecasted ({pred_occ:.1f}%). Recommending 12% incentive rate to capture shoulder season volume."
            else:
                rec_price = round(curr_price * 1.08, -1)
                rationale = f"Moderate occupancy expected ({pred_occ:.1f}%). Minor +8% rate adjustment aligned with baseline inflation and sustainability operating costs."

            # Clamp
            rec_price = max(prop.min_price, min(prop.max_price, rec_price))
            abs_diff = rec_price - curr_price
            pct_diff = round(((rec_price - curr_price) / curr_price) * 100, 1)

            status = 'applied' if idx == 0 else ('approved' if idx == 1 else 'pending')

            rec = PricingRecommendation(
                property_id=prop.id,
                room_type_id=rt.id,
                target_date=r_date,
                current_price=curr_price,
                recommended_price=rec_price,
                absolute_diff=abs_diff,
                percent_diff=pct_diff,
                predicted_demand=pred_rooms,
                predicted_occupancy=pred_occ,
                demand_multiplier=round(1.0 + (pred_occ - 50)/100 * 0.45, 2),
                event_impact_factor=1.18 if idx < 3 else 1.0,
                seasonal_factor=1.15,
                rationale=rationale,
                status=status,
                reviewed_by_id=manager.id if status != 'pending' else None,
                reviewed_at=datetime.datetime.utcnow() if status != 'pending' else None
            )
            db_session.add(rec)

            if status == 'applied':
                # Add price history
                ph = PriceHistory(
                    property_id=prop.id,
                    room_type_id=rt.id,
                    date_applied=r_date,
                    old_price=curr_price,
                    new_price=rec_price,
                    change_type='recommendation_applied',
                    recommendation_id=rec.id,
                    changed_by_id=manager.id,
                    reason='Automated dynamic rate adjustment approved by Hospitality Manager'
                )
                db_session.add(ph)

    # 7. Audit Log
    audit = AuditLog(
        user_id=admin.id,
        action='SYSTEM_INITIALIZED',
        entity_type='system',
        details={'message': 'Database seeded with demonstration eco-tourism properties, events, and bookings.'}
    )
    db_session.add(audit)

    # 8. Weather Observations Ingestion
    logger.info("Ingesting historical regional weather observations...")
    WeatherService.seed_from_csv()

    db_session.commit()
    logger.info("Demonstration database successfully seeded!")

if __name__ == '__main__':
    seed_database()
