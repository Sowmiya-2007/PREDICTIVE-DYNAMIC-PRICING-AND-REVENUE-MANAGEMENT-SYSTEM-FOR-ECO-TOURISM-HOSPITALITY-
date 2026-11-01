import pytest
import json

def test_get_revenue_analytics_endpoint(client):
    """Verify that /api/analytics/revenue returns valid JSON with all required keys."""
    resp = client.get('/api/analytics/revenue?preset=last_30_days')
    assert resp.status_code == 200
    data = json.loads(resp.data)
    assert data.get('success') is True
    assert 'date_range' in data
    assert 'kpis' in data
    assert 'trend_chart' in data
    assert 'breakdowns' in data
    assert 'limitations' in data

def test_revenue_kpi_formulas(client):
    """Verify that mathematical revenue formulas match USALI hospitality accounting."""
    resp = client.get('/api/analytics/revenue?preset=last_30_days')
    assert resp.status_code == 200
    kpis = json.loads(resp.data)['kpis']

    # Total revenue must equal net revenue
    assert kpis['total_revenue'] == kpis['net_revenue']
    # Gross revenue must equal net revenue + deductions
    assert round(kpis['gross_revenue'], 2) == round(kpis['net_revenue'] + kpis['deductions_cancelled'], 2)

    # If rooms were sold, ADR must equal total_revenue / sold_room_nights
    if kpis['sold_room_nights'] > 0:
        expected_adr = round(kpis['total_revenue'] / kpis['sold_room_nights'], 2)
        assert abs(kpis['adr'] - expected_adr) <= 0.05

    # If rooms were available, RevPAR must equal total_revenue / available_room_nights
    if kpis['available_room_nights'] > 0:
        expected_revpar = round(kpis['total_revenue'] / kpis['available_room_nights'], 2)
        assert abs(kpis['revpar'] - expected_revpar) <= 0.05

    # Period-over-period growth must be calculated
    assert 'growth' in kpis
    growth = kpis['growth']
    assert 'prev_total_revenue' in growth
    assert 'absolute_difference' in growth
    assert 'percentage_change' in growth

def test_revenue_date_presets(client):
    """Verify all requested date presets execute and calculate boundaries correctly."""
    presets = ['today', 'last_7_days', 'last_30_days', 'last_90_days', 'this_month', 'last_month', 'this_year']
    for p in presets:
        resp = client.get(f'/api/analytics/revenue?preset={p}')
        assert resp.status_code == 200
        data = json.loads(resp.data)
        assert data['success'] is True
        assert data['date_range']['preset'] == p

def test_revenue_chart_intervals(client):
    """Verify daily, weekly, monthly, and yearly trend intervals."""
    for interval in ['daily', 'weekly', 'monthly', 'yearly']:
        resp = client.get(f'/api/analytics/revenue?preset=last_30_days&interval={interval}')
        assert resp.status_code == 200
        data = json.loads(resp.data)
        assert isinstance(data['trend_chart'], list)

def test_revenue_property_filter(client):
    """Verify filtering by property isolates revenue to that sanctuary."""
    resp_all = client.get('/api/analytics/revenue?preset=last_30_days')
    resp_prop1 = client.get('/api/analytics/revenue?property_id=1&preset=last_30_days')
    assert resp_all.status_code == 200
    assert resp_prop1.status_code == 200

    data_all = json.loads(resp_all.data)
    data_prop1 = json.loads(resp_prop1.data)

    # Property 1 revenue must be less than or equal to total all properties revenue
    assert data_prop1['kpis']['total_revenue'] <= data_all['kpis']['total_revenue']
    # Room types must be filtered to Property 1's room types (2 room types)
    assert len(data_prop1['breakdowns']['by_room_type']) <= len(data_all['breakdowns']['by_room_type'])

