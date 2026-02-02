# Job Board APIs Research - 2026

Research conducted: February 2, 2026

## Executive Summary

The major job boards (Indeed, LinkedIn, Glassdoor) have significantly restricted or deprecated their public APIs. Indeed's Job Search API is deprecated, LinkedIn requires expensive partnerships, and Glassdoor closed public API access in 2021. For an MVP, alternative approaches include using third-party aggregator APIs (Adzuna, ZipRecruiter) or carefully implemented web scraping with proper legal considerations.

**MVP Recommendation**: Start with Adzuna API (free tier available) combined with ZipRecruiter API partnership. Avoid direct scraping of Indeed/LinkedIn/Glassdoor due to legal risks.

---

## Indeed

### Official API Status
**DEPRECATED - Not Available for New Integrations**

- The Indeed Job Search API was deprecated and is no longer available for new integrations
- The Publisher Jobs API (Get Job API and Job Search API) have been deprecated
- Only available APIs are Job Sync API (for posting jobs) and Sponsored Jobs API (for promoting jobs)

### Current API Offerings

#### Job Sync API
- **Purpose**: For partners to post jobs TO Indeed (not search jobs)
- **Authentication**: OAuth 2.0 with client ID and secret
- **Access tokens**: Valid for 1 hour
- **Requirements**: Must become an Indeed Partner with approved partnership status

#### Sponsored Jobs API
- **Purpose**: For promoting/sponsoring jobs (not searching)
- **Usage Policy (Effective Feb 1, 2026)**: Limited to customers with spending history
- **Minimum Spend**: €3 (EURO) per API call in EU markets, $3 (USD) in US, GB, CH, CA, AU, NZ, ID, IN, BR, PH, CL, SG, CO, TH, CR, MY, MX, PA
- **Eligibility**: Must have spent on job sponsorship within last 3 consecutive calendar months

### Cost/Free Tier
- No free tier for job searching
- Requires Indeed Partner status (approval needed)
- Sponsored Jobs API requires ongoing spending commitment

### Data Accessibility
Not applicable - job search functionality deprecated

### Fallback: Web Scraping

**Legal Status**: Indeed's Terms of Service explicitly prohibit scraping, particularly with bots or automated tools

**Technical Challenges**:
- Advanced anti-bot systems (Datadome, PerimeterX)
- IP blocking and rate limiting
- Dynamic content rendering

**Recommended Alternatives**:
- **JobsPikr**: DaaS provider offering real-time job data feeds as Indeed API replacement
- **Apify Indeed Scraper**: Automated job posting collection service
- **Scrapingdog**: 100% success rate with 14.47s avg response time
- **ZenRows**: 100% success rate with 22.23s avg response time
- **ScraperAPI**: Handles IP rotation, JavaScript rendering, anti-bot evasion

### Pros
- Large job database (if access were available)
- Well-structured data (historically)

### Cons
- API deprecated for job searching
- No public access for new integrations
- Partnership approval difficult to obtain
- Expensive to maintain (requires spending commitments)
- ToS prohibits scraping

### Implementation Notes
**DO NOT USE** for MVP. API not available for job searching. Scraping carries legal risks.

---

## LinkedIn

### Official API Status
**RESTRICTED - Partner Program Required**

### Authentication
- OAuth 2.0 for user authorization
- Access tokens provided after authorization
- Must become a LinkedIn Partner to access API

### Rate Limits
- Resets at midnight UTC daily
- Three throttling categories:
  - **Application throttling**: Total calls per application per day
  - **User throttling**: Calls per member per application per day
  - **Developer throttling**: ~4x higher limits for listed developers
- Rate-limited requests receive 429 response
- Monitor via LinkedIn Developer Portal "Usage & Limits" section

### Key Endpoints

#### Job Posting API
- **Purpose**: Authorize third parties to post jobs on behalf of customers
- **Requirements**:
  - Must be provisioned for test resources
  - Contact LinkedIn Business Development for Partner Onboarding Form
- **Access**: LinkedIn-certified partners only

#### Talent API
- **Purpose**: Access to job listings, candidate matching, recruiting data
- **Access**: LinkedIn-certified partners only

### Cost/Pricing Tiers

**Official LinkedIn API** (Profile data, not job-specific):
- **Basic Plan**: Free - Up to 3 people
- **Standard Plan**: $59/month - Up to 500 people
- **Premium Plan**: $499/month - Up to 10,000 people

**Job API Access**:
- Requires partnership program enrollment (no public pricing)
- LinkedIn's People Profile API: Over $10,000/year
- Partnership approval process required

### Data Accessibility
- Job listings (partners only)
- Candidate matching (partners only)
- Recruiting data (partners only)
- Public profile data (limited)

### Fallback: Web Scraping

**Legal Status**: LinkedIn Terms of Service prohibit job posting scraping

**Legal Precedent**: LinkedIn v. hiQ Labs - U.S. Court of Appeals ruled scraping public data doesn't necessarily breach CFAA if no technical barriers bypassed

**Technical Challenges**:
- Advanced anti-bot systems (Datadome, PerimeterX)
- Frequent DOM structure changes
- Login requirements for full job details

**Third-Party Alternatives**:
- **Proxycurl**: Fraction of LinkedIn's official API cost
- **Apify**: LinkedIn job scraping APIs with various export formats
- **Piloterr**: 50 free API credits for LinkedIn job search
- **Bright Data**: Dedicated LinkedIn endpoint

### Pros
- Comprehensive professional data
- Rich job details including company info, requirements
- Good for tech/professional roles

### Cons
- Extremely restrictive access requirements
- Partnership approval difficult and expensive
- High costs ($10,000+ annually)
- Scraping violates ToS (legal risks)
- Technical barriers to scraping

### Implementation Notes
**NOT RECOMMENDED for MVP**. Partnership costs too high, scraping carries significant legal risks.

---

## Glassdoor

### Official API Status
**CLOSED TO PUBLIC - Partner Access Only**

- Glassdoor closed public API access in 2021
- API available only to employers and approved partners
- No public developer program

### Available Actions (Partners Only)
- Job search actions (3 actions supported)
- Company API
- Additional Jobs APIs not publicly documented

### Authentication
Not publicly documented (partners only)

### Rate Limits
Not publicly documented (partners only)

### Key Endpoints
Not publicly documented (partners only)

### Cost/Free Tier
- No public pricing available
- Must contact Glassdoor to become API partner
- Partner approval required

### Data Accessibility (If Partner Status Obtained)
- Job listings
- Company insights
- Employer reviews
- Salary information
- Interview data

### Fallback: Web Scraping

**Legal Status**: Glassdoor Terms of Service specifically prohibit scraping. Glassdoor has taken legal action against scrapers.

**Legal Risks**: High - Glassdoor actively enforces ToS violations

**Technical Challenges**:
- Advanced anti-bot systems
- Login walls for detailed information
- Dynamic content loading

**Third-Party Alternatives**:
- **RapidAPI - Real-Time Glassdoor Data**: Unofficial API for job listings, reviews, salary data
- **Apify Glassdoor Jobs Scraper**: Programmatic access via Apify API
- **ScrapingBee**: Glassdoor Jobs Scraper API with free credits upon signup
- **OpenWeb Ninja**: Real-Time Glassdoor Data API
- **Piloterr**: Glassdoor Job Search Scraper API with free trial

### Pros
- Unique salary data
- Company reviews and ratings
- Interview insights
- Comprehensive employer information

### Cons
- No public API access
- Partnership extremely difficult to obtain
- ToS explicitly prohibits scraping
- Glassdoor actively pursues legal action against scrapers
- Highest legal risk among the three platforms

### Implementation Notes
**DO NOT USE for MVP**. No public API, highest legal risk, active enforcement of ToS violations.

---

## Alternative Solutions for MVP

### Recommended: Legitimate Job Board APIs

#### 1. Adzuna API (RECOMMENDED FOR MVP)

**Status**: Publicly available with free tier

**Access**:
- Register at developer.adzuna.com
- RESTful API with 9 endpoints
- Free API key available

**Endpoints**:
- Job search endpoint
- Employment data (salary and vacancy trends)
- Categories endpoint

**Example Request**:
```
GET http://api.adzuna.com/v1/api/jobs/gb/search/1?
    app_id={YOUR_API_ID}&
    app_key={YOUR_API_KEY}&
    results_per_page=20&
    what=javascript+developer&
    content-type=application/json
```

**Data Available**:
- Job titles
- Company names
- Job descriptions
- Salaries
- Locations
- Categories

**Pros**:
- Free tier available
- Simple REST API
- Good documentation
- Legal and legitimate access
- Multi-country support

**Cons**:
- Smaller job database than Indeed/LinkedIn
- Less well-known platform

---

#### 2. ZipRecruiter API

**Status**: Available via Publisher/Partner Program

**Access**:
- Sign up for publisher account
- Receive API key for authentication
- Partner/Publisher program enrollment

**API Types**:
- **Search API**: Display job matches on your site
- **Job API**: Post jobs to network (partners)

**Authentication**: Basic authentication

**Free Tier**: Not explicitly documented - requires publisher signup to determine

**Data Available**:
- Job listings
- Job posting capabilities
- Job board management

**Pros**:
- Large US job database
- Publisher program available
- Well-documented API

**Cons**:
- Free tier details unclear
- May require revenue-sharing agreement
- Focus on US market

---

#### 3. Google Jobs (via Third-Party APIs)

**Status**: Official Google Jobs API discontinued in 2021

**Cloud Talent Solution**: Available but designed for businesses to integrate job search into their own sites (not for accessing Google's job listings)

**Third-Party Access** (with free tiers):

- **SerpApi**: Cached searches free, not counted toward limits
- **SearchAPI**: Free plan available
- **OpenWeb Ninja**: Free tier, no payment method required
- **ScrapingBee**: 1000 free credits with API key
- **Serply.io**: Generous monthly free credits

**Pros**:
- Aggregates from many sources
- Multiple providers with free tiers
- Comprehensive coverage

**Cons**:
- Not direct Google API
- Relies on third-party services
- May have usage limits

---

### Data-as-a-Service (DaaS) Providers

#### JobsPikr
- Real-time job data feeds
- 600+ million job posting records
- Sources: Professional Networks, Indeed, Glassdoor, Wellfound
- Pre-aggregated data service

#### Coresignal
- Large job datasets
- Multiple source categories
- Enterprise-focused

#### Bright Data
- Dedicated endpoints for major job sites
- Enterprise web scraping infrastructure
- Legal compliance support

---

### Open Source Options

#### JobSpy (GitHub)
- **Repository**: speedyapply/JobSpy
- **Support**: LinkedIn, Indeed, Glassdoor, Google, ZipRecruiter
- **Method**: Concurrent scraping
- **License**: Open source

**Pros**:
- Free
- Multi-platform support
- Active development

**Cons**:
- Violates platform ToS
- Maintenance burden
- Legal risks
- May break with site changes

---

## Legal Considerations for Web Scraping

### General Legal Framework

**Positive Precedent**:
- LinkedIn v. hiQ Labs: Scraping public data doesn't necessarily breach CFAA if no technical barriers are bypassed
- Generally legal if scraping publicly available information and complying with GDPR/CCPA

**Risks**:
- All major job boards prohibit scraping in ToS
- LinkedIn, Indeed, Glassdoor have taken legal action
- Glassdoor most aggressive in enforcement
- Financial and legal risks present

### Data Privacy Regulations

**GDPR (EU) & CCPA (California)**:
- Strict guidelines on collecting and storing personal information
- Job postings often contain personal data
- Must implement proper data handling procedures
- Risk of regulatory penalties

### Terms of Service Violations

**LinkedIn**: Prohibits scraping in ToS
**Indeed**: Explicitly prohibits bots and automated tools
**Glassdoor**: Specifically prohibits scraping, actively enforces

### Technical Barriers

All three platforms use:
- Advanced anti-bot systems (Datadome, PerimeterX)
- IP blocking
- Rate limiting
- CAPTCHAs
- Honeypots

---

## MVP Implementation Recommendation

### Phase 1: Start with Legitimate APIs (Recommended)

**Primary Source**: Adzuna API
- Free tier available
- Legal and compliant
- Simple integration
- Good for proof of concept

**Secondary Source**: ZipRecruiter API
- Apply for publisher program
- Broader US coverage
- Complement Adzuna data

**Optional**: Google Jobs via Third-Party API
- Use SerpApi or ScrapingBee free tier
- Adds aggregated data
- Low risk, good coverage

### Phase 2: Consider DaaS Providers

If budget allows:
- **JobsPikr**: Real-time feeds from major platforms
- **Bright Data**: Enterprise-grade access with legal compliance
- Pre-aggregated, maintained data reduces legal risk

### What to AVOID for MVP

1. **Direct Scraping of Indeed/LinkedIn/Glassdoor**
   - High legal risk
   - ToS violations
   - Technical complexity
   - Maintenance burden
   - Potential for legal action

2. **Indeed API**
   - Not available for job searching
   - Deprecated functionality

3. **LinkedIn API**
   - Partnership costs too high for MVP
   - Approval process lengthy and uncertain

4. **Glassdoor API**
   - No public access
   - Highest enforcement risk

---

## Prioritization Matrix

| Platform | Accessibility | Cost | Data Quality | Legal Risk | MVP Suitability |
|----------|---------------|------|--------------|------------|-----------------|
| **Adzuna** | High | Free tier | Good | Low | **BEST** |
| **ZipRecruiter** | Medium | TBD | Good | Low | **RECOMMENDED** |
| **Google Jobs (3rd party)** | High | Free tier | Excellent | Low | **GOOD** |
| **DaaS (JobsPikr, etc)** | Medium | Paid | Excellent | Low | **GOOD** |
| Indeed | None | N/A | N/A | High (scraping) | **AVOID** |
| LinkedIn | Very Low | $10K+ | Excellent | High | **AVOID** |
| Glassdoor | None | N/A | Excellent | Very High | **AVOID** |

---

## Technical Implementation Strategy

### Recommended Architecture

```
┌─────────────────┐
│  Job Assistant  │
│   Application   │
└────────┬────────┘
         │
         ├─────────────► Adzuna API (Primary)
         │                - Free tier
         │                - Legal access
         │
         ├─────────────► ZipRecruiter API (Secondary)
         │                - Publisher program
         │                - US focus
         │
         └─────────────► Google Jobs API (Supplementary)
                          - Via SerpApi/ScrapingBee
                          - Aggregated data
```

### API Integration Checklist

1. **Adzuna Setup**
   - [ ] Register at developer.adzuna.com
   - [ ] Obtain app_id and app_key
   - [ ] Test search endpoint
   - [ ] Implement error handling
   - [ ] Monitor rate limits

2. **ZipRecruiter Setup**
   - [ ] Apply for publisher account
   - [ ] Review partnership terms
   - [ ] Obtain API key
   - [ ] Understand rate limits and costs
   - [ ] Implement search functionality

3. **Google Jobs (Optional)**
   - [ ] Choose third-party provider (SerpApi recommended)
   - [ ] Sign up for free tier
   - [ ] Test API calls
   - [ ] Monitor credit usage

### Development Priorities

**Week 1-2**: Adzuna Integration
- Basic search functionality
- Results parsing and display
- Error handling

**Week 3-4**: ZipRecruiter Integration
- Publisher account approval
- API integration
- Result aggregation with Adzuna

**Week 5-6**: Enhancement
- Google Jobs via third-party API
- Result deduplication
- Unified search interface

---

## Compliance Best Practices

1. **Respect robots.txt** (if scraping becomes necessary)
2. **Implement rate limiting** (be a good citizen)
3. **Cache results** (reduce API calls)
4. **Store only necessary data** (GDPR/CCPA compliance)
5. **Provide clear terms** (inform users of data sources)
6. **Monitor ToS changes** (platforms update regularly)
7. **Have legal review** (before production launch)

---

## Cost Estimates for MVP (6 months)

| Service | Setup Cost | Monthly Cost | Notes |
|---------|------------|--------------|-------|
| Adzuna API | $0 | $0 | Free tier sufficient for MVP |
| ZipRecruiter | $0 | $0-$? | Depends on publisher terms |
| SerpApi (Google Jobs) | $0 | $0 | Free tier: cached searches |
| **Total (Best Case)** | **$0** | **$0** | Legitimate, legal access |

**vs. Scraping Costs**:
- Developer time: High maintenance
- Proxy services: $50-500/month
- Anti-bot solutions: $100-1000/month
- Legal risk: Potentially $$$$$
- **Not recommended for MVP**

---

## Next Steps

1. **Immediate Action**: Register for Adzuna API developer account
2. **Week 1**: Apply for ZipRecruiter publisher program
3. **Week 1**: Research SerpApi for Google Jobs integration
4. **Week 2**: Begin Adzuna integration development
5. **Week 4**: Evaluate results and determine if additional sources needed
6. **Month 2**: Consider DaaS providers if budget available and more data needed

---

## Sources

### Indeed API Research
- [Job Sync API guide | Indeed Partner Docs](https://docs.indeed.com/job-sync-api/job-sync-api-guide)
- [Job Search API (Deprecated)](https://developer.indeed.com/docs/publisher-jobs/job-search)
- [Sponsored Jobs API usage policy | Indeed Partner Docs](https://docs.indeed.com/sponsored-jobs-api/sponsored-jobs-api-usage-policy)
- [Think beyond the Indeed API - Job data sources to explore](https://www.jobspikr.com/blog/beyond-indeed-api-discovering-powerful-alternatives-for-job-aggregation/)
- [Best Indeed Alternatives for Recruiters (2026)](https://juicebox.ai/blog/indeed-alternatives)

### LinkedIn API Research
- [LinkedIn API Rate Limiting - LinkedIn | Microsoft Learn](https://learn.microsoft.com/en-us/linkedin/shared/api-guide/concepts/rate-limits)
- [The LinkedIn API Pricing Guide You Need And How To Get Access | by Proxycurl | Medium](https://medium.com/@proxycurl/the-linkedin-api-pricing-guide-you-need-and-how-to-get-access-d2bf20242944)
- [Guide to LinkedIn API and Alternatives](https://scrapfly.io/blog/posts/guide-to-linkedin-api-and-alternatives)
- [What Is LinkedIn API? Complete Guide On How It Works [2026]](https://evaboot.com/blog/what-is-linkedin-api)
- [Job Posting API Overview - LinkedIn | Microsoft Learn](https://learn.microsoft.com/en-us/linkedin/talent/job-postings/api/overview?view=li-lts-2025-10)

### Glassdoor API Research
- [Glassdoor Jobs API Documentation | Glassdoor](https://www.glassdoor.com/developer/jobsApiActions.htm)
- [What is the Glassdoor API? How to Use It and Alternatives | Zuplo Learning Center](https://zuplo.com/learning-center/what-is-glassdoor-api)
- [Real-Time Glassdoor Data](https://rapidapi.com/letscrape-6bRBa3QguO5/api/real-time-glassdoor-data)
- [Best Glassdoor Scraper Tools and Python Tutorial in 2026](https://research.aimultiple.com/glassdoor-scraper/)

### Alternative APIs & Legal Research
- [ZipRecruiter API — Free Public API | Public APIs Directory](https://publicapis.io/zip-recruiter-api)
- [ZipRecruiter Partner Platform Documentation](https://www.ziprecruiter.com/partner/documentation/)
- [Adzuna API](https://developer.adzuna.com/)
- [Adzuna API Overview](https://developer.adzuna.com/overview)
- [Google Jobs API - SerpApi](https://serpapi.com/google-jobs-api)
- [Guide to Google Jobs API and Alternatives](https://scrapfly.io/blog/posts/guide-to-google-jobs-api-and-alternatives)

### Web Scraping & Legal Considerations
- [GitHub - speedyapply/JobSpy: Jobs scraper library for LinkedIn, Indeed, Glassdoor, Google, ZipRecruiter & more](https://github.com/speedyapply/JobSpy)
- [Is Job Scraping Legal? Yes, when done in compliance.](https://en.blog.mantiks.io/is-job-scraping-legal/)
- [Job Scraping Explained: Modern Techniques, Tools & Legal Insights for 2025](https://www.jobspikr.com/blog/guide-to-job-scraping/)
- [Job Board Scraper API to Collect Fresh Job Listing Data - ScraperAPI](https://www.scraperapi.com/solutions/job-boards-scraper/)
- [The Best Job Posting Data Providers in 2026: Tested Providers - Proxyway](https://proxyway.com/best/job-posting-data)

---

*Research compiled: February 2, 2026*
*Last updated: February 2, 2026*
