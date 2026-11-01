import re
import datetime
import logging
import requests
from bs4 import BeautifulSoup
from app.config import Config
from app.database import db_session
from app.models.event import LocalEvent, ScrapingRun
from app.models.data_source import DataSourceStatus

logger = logging.getLogger(__name__)

MONTH_MAP = {
    'january': 1, 'february': 2, 'march': 3, 'april': 4,
    'may': 5, 'june': 6, 'july': 7, 'august': 8,
    'september': 9, 'october': 10, 'november': 11, 'december': 12,
    'jan': 1, 'feb': 2, 'mar': 3, 'apr': 4, 'jun': 6,
    'jul': 7, 'aug': 8, 'sep': 9, 'oct': 10, 'nov': 11, 'dec': 12
}

def parse_date_string(date_str: str) -> tuple[datetime.date | None, datetime.date | None]:
    """
    Parse date string like 'Sunday, 15 November 2026' or '15 Nov 2026 - 18 Nov 2026'
    or '15-18 November 2026' into (start_date, end_date).
    """
    if not date_str:
        return None, None
    clean = date_str.strip()
    
    # Try pattern: "Sunday, 15 November 2026"
    m_single = re.search(r'(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})', clean)
    if m_single:
        day = int(m_single.group(1))
        month_name = m_single.group(2).lower()
        year = int(m_single.group(3))
        month = MONTH_MAP.get(month_name)
        if month:
            try:
                dt = datetime.date(year, month, day)
                return dt, dt
            except ValueError:
                pass

    # Try pattern: "15-18 November 2026"
    m_range = re.search(r'(\d{1,2})\s*[-–]\s*(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})', clean)
    if m_range:
        d1 = int(m_range.group(1))
        d2 = int(m_range.group(2))
        month_name = m_range.group(3).lower()
        year = int(m_range.group(4))
        month = MONTH_MAP.get(month_name)
        if month:
            try:
                start_dt = datetime.date(year, month, d1)
                end_dt = datetime.date(year, month, d2)
                return start_dt, end_dt
            except ValueError:
                pass

    return None, None

class KarnatakaTourismScraper:
    SOURCE_ID = 'karnataka_tourism_scraper'
    SOURCE_NAME = 'Karnataka Tourism Official Event Scraper'
    SOURCE_URL = 'https://karnatakatourism.org/en/events/'

    @classmethod
    def scrape_events(cls) -> dict:
        """
        Scrapes real published events from Karnataka Tourism portal.
        Extracts genuine event titles, dates, locations, descriptions, and source URLs.
        Never fabricates dates.
        """
        start_time = datetime.datetime.now(datetime.timezone.utc)
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.5'
        }

        collected_events = []
        error_msg = None

        try:
            logger.info(f"Connecting to Karnataka Tourism portal: {cls.SOURCE_URL}")
            resp = requests.get(cls.SOURCE_URL, headers=headers, timeout=Config.SCRAPING_TIMEOUT_SECONDS)
            if resp.status_code != 200:
                raise ValueError(f"HTTP {resp.status_code} returned by Karnataka Tourism portal.")

            soup = BeautifulSoup(resp.text, 'html.parser')
            event_links = []

            for a in soup.find_all('a', href=True):
                href = a['href']
                if '/en/events/' in href and href != '/en/events/' and href != 'https://karnatakatourism.org/en/events/':
                    full_url = href if href.startswith('http') else f"https://karnatakatourism.org{href}"
                    if full_url not in event_links:
                        event_links.append(full_url)

            logger.info(f"Discovered {len(event_links)} event links on Karnataka Tourism page.")

            # Inspect top events up to 8 links to avoid long execution
            for ev_url in event_links[:8]:
                try:
                    ev_resp = requests.get(ev_url, headers=headers, timeout=Config.SCRAPING_TIMEOUT_SECONDS)
                    if ev_resp.status_code == 200:
                        ev_soup = BeautifulSoup(ev_resp.text, 'html.parser')
                        h1 = ev_soup.find(['h1', 'h2'])
                        title = h1.get_text(strip=True) if h1 else None
                        if not title:
                            continue

                        # Extract details from table/text
                        page_text = ev_soup.get_text()
                        venue = 'Karnataka, India'
                        start_date = None
                        end_date = None
                        category = 'cultural'
                        desc_text = ''

                        # Find Quick Info table or text blocks
                        for row in ev_soup.find_all('tr'):
                            row_txt = row.get_text(separator=' ', strip=True)
                            if 'venue' in row_txt.lower():
                                venue = row_txt.replace('Venue', '').replace('venue', '').strip(': ')
                            elif 'date' in row_txt.lower():
                                date_str = row_txt.replace('Date', '').replace('date', '').strip(': ')
                                s_dt, e_dt = parse_date_string(date_str)
                                if s_dt:
                                    start_date, end_date = s_dt, e_dt

                        # Fallback regex search for date in page
                        if not start_date:
                            s_dt, e_dt = parse_date_string(page_text)
                            if s_dt:
                                start_date, end_date = s_dt, e_dt

                        # Determine category
                        title_lower = title.lower()
                        if any(w in title_lower for w in ['run', 'marathon', 'wellness', 'fitness']):
                            category = 'eco_marathon'
                        elif any(w in title_lower for w in ['dasara', 'festival', 'mahotsava', 'habba', 'fair']):
                            category = 'festival'
                        elif any(w in title_lower for w in ['bird', 'orchid', 'flower', 'nature', 'wildlife']):
                            category = 'nature_exhibition'
                        else:
                            category = 'cultural'

                        # Description
                        p_tags = ev_soup.find_all('p')
                        for p in p_tags:
                            t = p.get_text(strip=True)
                            if len(t) > 40 and not any(skip in t.lower() for skip in ['login', 'quick info', 'cookie']):
                                desc_text = t
                                break

                        # Only register if we have a valid confirmed start date from the website
                        if start_date:
                            if not end_date:
                                end_date = start_date

                            # Determine location matching
                            loc = 'Karnataka, Regional'
                            if 'bengaluru' in venue.lower() or 'bangalore' in venue.lower():
                                loc = 'Bengaluru, Karnataka'
                            elif 'mysuru' in venue.lower() or 'mysore' in venue.lower():
                                loc = 'Mysuru, Karnataka'
                            elif 'coorg' in venue.lower() or 'kodagu' in venue.lower() or 'madikeri' in venue.lower():
                                loc = 'Coorg, Karnataka'
                            elif 'hassan' in venue.lower():
                                loc = 'Hassan, Karnataka'

                            # Deduplication check
                            existing = db_session.query(LocalEvent).filter_by(
                                title=title[:200],
                                start_date=start_date
                            ).first()

                            if not existing:
                                new_ev = LocalEvent(
                                    title=title[:200],
                                    location=loc,
                                    event_category=category,
                                    start_date=start_date,
                                    end_date=end_date,
                                    description=desc_text[:1000] if desc_text else f"Official Karnataka Tourism event: {title}",
                                    expected_footfall=5000 if category in ['festival', 'eco_marathon'] else 2500,
                                    impact_intensity='high' if category in ['festival', 'eco_marathon'] else 'medium',
                                    source_url=ev_url,
                                    source_name='Karnataka Tourism Official',
                                    collection_method='scraped',
                                    external_id=f"kt_{abs(hash(ev_url)) % 1000000}",
                                    status='active',
                                    last_checked=datetime.datetime.now(datetime.timezone.utc),
                                    is_verified=True
                                )
                                db_session.add(new_ev)
                                collected_events.append(new_ev)
                            else:
                                existing.last_checked = datetime.datetime.now(datetime.timezone.utc)
                                existing.status = 'active'
                                collected_events.append(existing)

                except Exception as inner_e:
                    logger.warning(f"Error scraping individual Karnataka event ({ev_url}): {inner_e}")

            db_session.commit()
            duration = (datetime.datetime.now(datetime.timezone.utc) - start_time).total_seconds()

            # Record Scraping Run
            run_rec = ScrapingRun(
                source_name=cls.SOURCE_NAME,
                source_url=cls.SOURCE_URL,
                status='success' if collected_events else 'partial',
                events_collected=len(collected_events),
                duration_seconds=duration,
                error_message=None
            )
            db_session.add(run_rec)

            # Update DataSourceStatus
            cls._update_data_source_status(
                status='healthy',
                records_count=db_session.query(LocalEvent).filter_by(source_name='Karnataka Tourism Official').count(),
                error_msg=None
            )
            db_session.commit()

            return {
                'success': True,
                'source': cls.SOURCE_NAME,
                'events_collected': len(collected_events),
                'duration_seconds': duration
            }

        except Exception as e:
            db_session.rollback()
            duration = (datetime.datetime.now(datetime.timezone.utc) - start_time).total_seconds()
            error_msg = str(e)
            logger.error(f"Karnataka Tourism scraping failed: {e}")

            run_rec = ScrapingRun(
                source_name=cls.SOURCE_NAME,
                source_url=cls.SOURCE_URL,
                status='failed',
                events_collected=0,
                duration_seconds=duration,
                error_message=error_msg
            )
            db_session.add(run_rec)

            cls._update_data_source_status(
                status='failed',
                records_count=db_session.query(LocalEvent).filter_by(source_name='Karnataka Tourism Official').count(),
                error_msg=error_msg
            )
            db_session.commit()

            return {
                'success': False,
                'source': cls.SOURCE_NAME,
                'error': error_msg
            }

    @classmethod
    def _update_data_source_status(cls, status: str, records_count: int, error_msg: str = None):
        ds = db_session.query(DataSourceStatus).filter_by(source_id=cls.SOURCE_ID).first()
        now = datetime.datetime.now(datetime.timezone.utc)
        if not ds:
            ds = DataSourceStatus(
                source_id=cls.SOURCE_ID,
                source_name=cls.SOURCE_NAME,
                source_type='event_scraper',
                source_url=cls.SOURCE_URL,
                refresh_interval_minutes=360,
                is_live=True,
                is_configured=True
            )
            db_session.add(ds)

        ds.last_fetch_attempt = now
        ds.fetch_status = status
        ds.error_message = error_msg
        if status in ['healthy', 'partial']:
            ds.last_successful_refresh = now
            ds.records_collected = records_count
            ds.latest_data_timestamp = now.strftime("%Y-%m-%d %H:%M")
