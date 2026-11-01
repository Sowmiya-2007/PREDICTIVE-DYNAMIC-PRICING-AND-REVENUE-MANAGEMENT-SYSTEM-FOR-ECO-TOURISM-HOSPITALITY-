from app.services.scraping_service import EventScraperService

def test_scraper_service_execution():
    result = EventScraperService.scrape_from_source('kerala_tourism')
    assert result is not None
    assert 'events_collected' in result
    assert result['events_collected'] > 0
    assert result['status'] in ['success', 'partial']
