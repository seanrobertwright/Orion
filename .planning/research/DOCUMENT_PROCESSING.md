# Document Processing with Claude API for Resume Analysis

## Executive Summary

Claude API (particularly Claude 3.5+ Sonnet and Opus 4.5) provides native PDF processing capabilities ideal for resume parsing, skill extraction, and job matching applications. This document outlines technical approaches, code patterns, cost considerations, and best practices for building a resume processing system for job hunt applications in 2026.

## 1. Claude's Capabilities for Resume Parsing

### Native PDF Processing
- **Availability**: All active Claude models (Sonnet 4.5, Opus 4.5, Haiku 4.5) support PDF processing in production (beta: `pdfs-2024-09-25`)
- **How It Works**: Claude extracts PDF contents and converts each page into an image, then uses vision capabilities to analyze text and visual elements
- **Supported Content**: Text, images, charts, tables, complex layouts
- **Document Limits**: Up to 100 pages per PDF
- **Token Consumption**: 1,500-3,000 tokens per page (varies by content density)

### Vision-Based Analysis
Claude's PDF support relies on its vision capabilities, enabling:
- Understanding formatted resumes with complex layouts
- Extracting information from tables and structured sections
- Reading visual elements (logos, icons, formatting)
- Handling scanned documents (with proper OCR pre-processing)

### Structured Output Capabilities
Claude's structured outputs (GA as of 2026) provide:
- **JSON Schema Compliance**: Mathematical certainty that responses match your schema using constrained decoding
- **No Parsing Errors**: Guaranteed valid JSON without parse/retry loops
- **Type Safety**: Direct extraction to typed objects using Pydantic/Zod
- **Field Validation**: Built-in schema validation during generation

## 2. Document Handling Strategies

### PDF Processing

#### Method 1: Direct Base64 Encoding (Simple Approach)
```python
import anthropic
import base64

def process_resume_direct(pdf_path: str, prompt: str):
    """Process resume PDF using direct base64 encoding"""
    with open(pdf_path, "rb") as pdf_file:
        pdf_data = base64.standard_b64encode(pdf_file.read()).decode("utf-8")

    client = anthropic.Anthropic(api_key="your-api-key")

    message = client.messages.create(
        model="claude-3-5-sonnet-20241022",
        betas=["pdfs-2024-09-25"],
        max_tokens=4096,
        messages=[
            {
                "role": "user",
                "content": [
                    {
                        "type": "document",
                        "source": {
                            "type": "base64",
                            "media_type": "application/pdf",
                            "data": pdf_data
                        }
                    },
                    {
                        "type": "text",
                        "text": prompt
                    }
                ]
            }
        ]
    )

    return message.content[0].text
```

**Use Case**: Single resume processing, quick prototyping
**Pros**: Simple, no external storage needed
**Cons**: Re-uploads same data for repeated analysis

#### Method 2: Files API (Production Approach)
```python
import anthropic

def process_resume_with_files_api(pdf_path: str, prompt: str):
    """Process resume using Files API for reusable uploads"""
    client = anthropic.Anthropic(api_key="your-api-key")

    # Upload file once
    with open(pdf_path, "rb") as pdf_file:
        uploaded_file = client.files.upload(
            file=pdf_file,
            purpose="resume_processing"
        )

    # Use file_id for processing (can reuse multiple times)
    message = client.messages.create(
        model="claude-3-5-sonnet-20241022",
        max_tokens=4096,
        messages=[
            {
                "role": "user",
                "content": [
                    {
                        "type": "document",
                        "source": {
                            "type": "file",
                            "file_id": uploaded_file.id
                        },
                        "title": "Resume",
                        "context": "This is a job applicant's resume",
                        "citations": True
                    },
                    {
                        "type": "text",
                        "text": prompt
                    }
                ]
            }
        ]
    )

    return message.content[0].text, uploaded_file.id
```

**Use Case**: Multiple analyses of same resume, production systems
**Pros**: Upload once, reference by ID, reduced bandwidth/costs
**Cons**: Requires file management, beta feature

#### Method 3: URL Reference (External Hosting)
```python
message = client.messages.create(
    model="claude-3-5-sonnet-20241022",
    messages=[
        {
            "role": "user",
            "content": [
                {
                    "type": "document",
                    "source": {
                        "type": "url",
                        "url": "https://your-storage.com/resumes/candidate123.pdf"
                    }
                },
                {"type": "text", "text": prompt}
            ]
        }
    ]
)
```

**Use Case**: Resumes stored in cloud storage (S3, Azure Blob, etc.)
**Pros**: No encoding overhead, efficient for large-scale systems
**Cons**: Requires public/signed URLs, external dependency

### DOCX/Word Document Handling

**Important Limitation**: Claude extracts text-only from DOCX files; images inside DOCX are not interpreted.

**Best Practice**: Convert DOCX to PDF first, then use PDF processing to leverage full visual understanding.

```python
from docx2pdf import convert
import tempfile

def process_docx_resume(docx_path: str, prompt: str):
    """Convert DOCX to PDF, then process with Claude"""
    with tempfile.NamedTemporaryFile(suffix=".pdf", delete=False) as tmp_pdf:
        # Convert DOCX to PDF
        convert(docx_path, tmp_pdf.name)

        # Process PDF with Claude
        result = process_resume_direct(tmp_pdf.name, prompt)

    return result
```

### Plain Text Resumes
```python
def process_text_resume(text_content: str, prompt: str):
    """Process plain text resume"""
    client = anthropic.Anthropic(api_key="your-api-key")

    message = client.messages.create(
        model="claude-3-5-sonnet-20241022",
        max_tokens=4096,
        messages=[
            {
                "role": "user",
                "content": f"{prompt}\n\nResume:\n{text_content}"
            }
        ]
    )

    return message.content[0].text
```

## 3. Prompt Engineering for Skill Extraction

### Basic Skill Extraction Prompt
```python
SKILL_EXTRACTION_PROMPT = """
Analyze this resume and extract the following information:

1. Technical Skills: Programming languages, frameworks, tools, technologies
2. Soft Skills: Communication, leadership, problem-solving, etc.
3. Years of Experience: Total and per technology/role
4. Education: Degrees, certifications, institutions
5. Work History: Companies, roles, dates, key achievements
6. Projects: Notable projects and technologies used

Return the information in a structured format.
"""
```

### Advanced Prompt with Structured Output
```python
from pydantic import BaseModel, Field
from typing import List, Optional

class Experience(BaseModel):
    company: str
    role: str
    start_date: str
    end_date: Optional[str]
    responsibilities: List[str]
    achievements: List[str]
    technologies_used: List[str]

class Education(BaseModel):
    institution: str
    degree: str
    field_of_study: str
    graduation_date: Optional[str]
    gpa: Optional[float]

class ResumeData(BaseModel):
    full_name: str
    email: Optional[str]
    phone: Optional[str]
    location: Optional[str]
    summary: str
    technical_skills: List[str] = Field(description="Programming languages, frameworks, tools")
    soft_skills: List[str] = Field(description="Communication, leadership, etc.")
    work_experience: List[Experience]
    education: List[Education]
    certifications: List[str]
    total_years_experience: Optional[int]

def extract_resume_data_structured(pdf_path: str) -> ResumeData:
    """Extract resume data with guaranteed schema compliance"""
    client = anthropic.Anthropic(api_key="your-api-key")

    with open(pdf_path, "rb") as pdf_file:
        pdf_data = base64.standard_b64encode(pdf_file.read()).decode("utf-8")

    # Claude's structured output guarantees JSON schema compliance
    message = client.messages.create(
        model="claude-3-5-sonnet-20241022",
        betas=["pdfs-2024-09-25"],
        max_tokens=4096,
        output_config={
            "format": "json",
            "schema": ResumeData.model_json_schema()
        },
        messages=[
            {
                "role": "user",
                "content": [
                    {
                        "type": "document",
                        "source": {
                            "type": "base64",
                            "media_type": "application/pdf",
                            "data": pdf_data
                        }
                    },
                    {
                        "type": "text",
                        "text": """
                        Analyze this resume and extract all relevant information.
                        Be thorough and accurate. If information is not available,
                        use null/empty values as appropriate.
                        """
                    }
                ]
            }
        ]
    )

    # Parse directly - guaranteed valid JSON
    return ResumeData.model_validate_json(message.content[0].text)
```

### Job Matching Prompt
```python
JOB_MATCHING_PROMPT = """
You are an expert technical recruiter. Compare this candidate's resume against
the job description and provide:

1. Match Score (0-100): Overall compatibility
2. Matching Skills: Skills that align with requirements
3. Missing Skills: Required skills the candidate lacks
4. Transferable Skills: Skills that could apply to requirements
5. Experience Alignment: How well their experience fits the role
6. Recommendation: Hire/Interview/Pass with detailed reasoning
7. Key Strengths: Top 3 strengths for this specific role
8. Development Areas: Skills to develop for better fit

Job Description:
{job_description}

Provide detailed, specific analysis with examples from the resume.
"""

class JobMatch(BaseModel):
    match_score: int = Field(ge=0, le=100)
    matching_skills: List[str]
    missing_skills: List[str]
    transferable_skills: List[str]
    experience_alignment: str
    recommendation: str  # "hire", "interview", "pass"
    key_strengths: List[str]
    development_areas: List[str]
    detailed_reasoning: str

def match_resume_to_job(resume_file_id: str, job_description: str) -> JobMatch:
    """Match resume against job requirements"""
    client = anthropic.Anthropic(api_key="your-api-key")

    message = client.messages.create(
        model="claude-3-5-sonnet-20241022",
        max_tokens=4096,
        output_config={
            "format": "json",
            "schema": JobMatch.model_json_schema()
        },
        messages=[
            {
                "role": "user",
                "content": [
                    {
                        "type": "document",
                        "source": {"type": "file", "file_id": resume_file_id}
                    },
                    {
                        "type": "text",
                        "text": JOB_MATCHING_PROMPT.format(job_description=job_description)
                    }
                ]
            }
        ]
    )

    return JobMatch.model_validate_json(message.content[0].text)
```

### Resume Tailoring Prompt
```python
RESUME_TAILORING_PROMPT = """
You are an expert resume writer. Analyze the candidate's complete resume and
the target job description, then provide recommendations for tailoring the
resume to maximize interview chances:

1. Summary/Objective: Suggested rewrite emphasizing relevant experience
2. Skills Section: Reorder skills to highlight relevant ones first
3. Experience Bullets: Rewrite 3-5 bullets per role to emphasize relevant achievements
4. Keywords to Add: Important keywords from job description to incorporate
5. Sections to Emphasize: Which parts to expand
6. Sections to Minimize: Which parts to reduce
7. Projects to Highlight: Relevant projects to feature prominently

Job Description:
{job_description}

Provide specific, actionable recommendations with before/after examples.
"""

class TailoringRecommendations(BaseModel):
    suggested_summary: str
    skills_order: List[str]
    experience_rewrites: dict  # role -> list of rewritten bullets
    keywords_to_add: List[str]
    sections_to_emphasize: List[str]
    sections_to_minimize: List[str]
    projects_to_highlight: List[str]
    overall_strategy: str

def get_tailoring_recommendations(resume_file_id: str, job_description: str) -> TailoringRecommendations:
    """Get recommendations for tailoring resume to specific job"""
    client = anthropic.Anthropic(api_key="your-api-key")

    message = client.messages.create(
        model="claude-3-5-sonnet-20241022",
        max_tokens=8192,  # Larger output for detailed recommendations
        output_config={
            "format": "json",
            "schema": TailoringRecommendations.model_json_schema()
        },
        messages=[
            {
                "role": "user",
                "content": [
                    {
                        "type": "document",
                        "source": {"type": "file", "file_id": resume_file_id}
                    },
                    {
                        "type": "text",
                        "text": RESUME_TAILORING_PROMPT.format(job_description=job_description)
                    }
                ]
            }
        ]
    )

    return TailoringRecommendations.model_validate_json(message.content[0].text)
```

## 4. Cost and Token Considerations

### Pricing Structure (2026)

| Model | Input (per 1M tokens) | Output (per 1M tokens) | Use Case |
|-------|----------------------|------------------------|----------|
| Claude Haiku 4.5 | $1.00 | $5.00 | Quick skill extraction, simple parsing |
| Claude Sonnet 4.5 | $3.00 | $15.00 | Balanced - recommended for most use cases |
| Claude Opus 4.5 | $5.00 | $25.00 | Complex analysis, nuanced matching |

### Token Estimation

**Resume Processing:**
- Average 2-page resume: ~3,000-6,000 input tokens
- Structured extraction output: ~1,000-2,000 tokens
- Total per resume: ~4,000-8,000 tokens

**Job Matching:**
- Resume (cached): ~90% reduction = ~300-600 tokens
- Job description: ~500-1,500 tokens
- Match analysis output: ~1,500-2,500 tokens
- Total: ~2,300-4,600 tokens per match

**Cost Examples (Claude Sonnet 4.5):**
- Process 100 resumes: ~400K-800K tokens = $1.20-$2.40
- Match 100 resumes against 1 job (with caching): ~230K-460K tokens = $0.69-$1.38
- Tailor 10 resumes: ~100K-150K tokens = $0.30-$0.45

### Cost Optimization Strategies

#### 1. Prompt Caching (Critical for Resume Processing)
```python
def process_resume_with_caching(resume_file_id: str, job_description: str):
    """Use prompt caching to reduce costs by 90% for repeated job matching"""
    client = anthropic.Anthropic(api_key="your-api-key")

    message = client.messages.create(
        model="claude-3-5-sonnet-20241022",
        max_tokens=4096,
        messages=[
            {
                "role": "user",
                "content": [
                    {
                        "type": "document",
                        "source": {"type": "file", "file_id": resume_file_id},
                        "cache_control": {"type": "ephemeral"}  # Cache the resume
                    },
                    {
                        "type": "text",
                        "text": job_description,
                        "cache_control": {"type": "ephemeral"}  # Cache the job description
                    },
                    {
                        "type": "text",
                        "text": "Analyze the match between this resume and job description."
                    }
                ]
            }
        ]
    )

    return message
```

**Caching Benefits:**
- First request: Standard pricing + 25% cache write surcharge
- Subsequent requests (within 5 min): 90% discount on cached content
- Example: Matching 50 resumes against 1 job description
  - Without caching: ~$2.00
  - With caching: ~$0.40 (80% savings)

#### 2. Batch API (50% Discount)
```python
import anthropic

def process_resumes_batch(resume_paths: List[str]) -> str:
    """Process multiple resumes asynchronously with 50% discount"""
    client = anthropic.Anthropic(api_key="your-api-key")

    # Create batch requests
    requests = []
    for i, path in enumerate(resume_paths):
        with open(path, "rb") as f:
            pdf_data = base64.standard_b64encode(f.read()).decode("utf-8")

        requests.append({
            "custom_id": f"resume_{i}",
            "params": {
                "model": "claude-3-5-sonnet-20241022",
                "max_tokens": 4096,
                "messages": [
                    {
                        "role": "user",
                        "content": [
                            {
                                "type": "document",
                                "source": {
                                    "type": "base64",
                                    "media_type": "application/pdf",
                                    "data": pdf_data
                                }
                            },
                            {"type": "text", "text": SKILL_EXTRACTION_PROMPT}
                        ]
                    }
                ]
            }
        })

    # Submit batch
    batch = client.batches.create(requests=requests)

    return batch.id  # Poll for results later

# Poll for results
def get_batch_results(batch_id: str):
    client = anthropic.Anthropic(api_key="your-api-key")
    batch = client.batches.retrieve(batch_id)

    if batch.processing_status == "ended":
        return batch.results
    else:
        return None  # Still processing
```

**Batch API Benefits:**
- 50% discount on both input and output tokens
- Ideal for: Bulk resume processing, nightly job matching runs
- Processing time: Usually completes within minutes to hours

#### 3. Model Selection Strategy
```python
def smart_model_selection(task_type: str, resume_complexity: str) -> str:
    """Select optimal model based on task and complexity"""

    if task_type == "simple_extraction":
        return "claude-haiku-4-5"  # $1 input - fastest, cheapest

    elif task_type == "skill_extraction":
        if resume_complexity == "simple":
            return "claude-haiku-4-5"
        else:
            return "claude-sonnet-4-5"  # $3 input - balanced

    elif task_type == "job_matching":
        return "claude-sonnet-4-5"  # Recommended for nuanced analysis

    elif task_type == "resume_tailoring":
        return "claude-opus-4-5"  # $5 input - most sophisticated

    else:
        return "claude-sonnet-4-5"  # Default
```

### Extended Context Pricing
- Standard context: Up to 200K tokens at base pricing
- Extended context (200K-1M tokens): Premium pricing applies to all tokens
- For resume processing: Unlikely to hit 200K limit unless processing entire application portfolio at once

## 5. PostgreSQL Schema Design

### Recommended Schema for Resume Data

```sql
-- Core tables for resume processing system

-- Candidates table
CREATE TABLE candidates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    phone VARCHAR(50),
    location VARCHAR(255),
    linkedin_url VARCHAR(500),
    github_url VARCHAR(500),
    portfolio_url VARCHAR(500),
    total_years_experience INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Resumes table (supports multiple versions per candidate)
CREATE TABLE resumes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    candidate_id UUID NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
    version_name VARCHAR(100),  -- e.g., "Software Engineer v1", "Data Analyst"
    file_path VARCHAR(500) NOT NULL,
    file_type VARCHAR(20) NOT NULL,  -- pdf, docx, txt
    file_size_bytes INTEGER,
    claude_file_id VARCHAR(255),  -- For Files API
    original_filename VARCHAR(255),
    summary TEXT,
    is_current BOOLEAN DEFAULT TRUE,
    processed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT unique_candidate_version UNIQUE(candidate_id, version_name)
);

-- Create index for faster queries
CREATE INDEX idx_resumes_candidate ON resumes(candidate_id);
CREATE INDEX idx_resumes_claude_file ON resumes(claude_file_id);

-- Skills table (normalized)
CREATE TABLE skills (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) UNIQUE NOT NULL,
    category VARCHAR(50) NOT NULL,  -- technical, soft, domain, tool, language
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Resume skills junction table (many-to-many)
CREATE TABLE resume_skills (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    resume_id UUID NOT NULL REFERENCES resumes(id) ON DELETE CASCADE,
    skill_id UUID NOT NULL REFERENCES skills(id) ON DELETE CASCADE,
    proficiency_level VARCHAR(50),  -- beginner, intermediate, advanced, expert
    years_of_experience DECIMAL(4,1),
    last_used_year INTEGER,
    is_primary BOOLEAN DEFAULT FALSE,  -- Primary skills to highlight

    CONSTRAINT unique_resume_skill UNIQUE(resume_id, skill_id)
);

CREATE INDEX idx_resume_skills_resume ON resume_skills(resume_id);
CREATE INDEX idx_resume_skills_skill ON resume_skills(skill_id);

-- Work experience table
CREATE TABLE work_experience (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    resume_id UUID NOT NULL REFERENCES resumes(id) ON DELETE CASCADE,
    company_name VARCHAR(255) NOT NULL,
    role_title VARCHAR(255) NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE,
    is_current BOOLEAN DEFAULT FALSE,
    location VARCHAR(255),
    description TEXT,
    achievements JSONB,  -- Array of achievement strings
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_work_experience_resume ON work_experience(resume_id);
CREATE INDEX idx_work_experience_dates ON work_experience(start_date, end_date);

-- Experience skills junction (tracks which skills used at each job)
CREATE TABLE experience_skills (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    experience_id UUID NOT NULL REFERENCES work_experience(id) ON DELETE CASCADE,
    skill_id UUID NOT NULL REFERENCES skills(id) ON DELETE CASCADE,

    CONSTRAINT unique_experience_skill UNIQUE(experience_id, skill_id)
);

-- Education table
CREATE TABLE education (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    resume_id UUID NOT NULL REFERENCES resumes(id) ON DELETE CASCADE,
    institution_name VARCHAR(255) NOT NULL,
    degree VARCHAR(255) NOT NULL,
    field_of_study VARCHAR(255),
    graduation_date DATE,
    gpa DECIMAL(3,2),
    honors TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_education_resume ON education(resume_id);

-- Certifications table
CREATE TABLE certifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    resume_id UUID NOT NULL REFERENCES resumes(id) ON DELETE CASCADE,
    certification_name VARCHAR(255) NOT NULL,
    issuing_organization VARCHAR(255),
    issue_date DATE,
    expiration_date DATE,
    credential_id VARCHAR(255),
    credential_url VARCHAR(500),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_certifications_resume ON certifications(resume_id);

-- Jobs table (target positions)
CREATE TABLE jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_name VARCHAR(255) NOT NULL,
    role_title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    requirements TEXT,
    location VARCHAR(255),
    salary_range VARCHAR(100),
    job_url VARCHAR(500),
    source VARCHAR(100),  -- linkedin, indeed, company_site, etc.
    status VARCHAR(50) DEFAULT 'active',  -- active, closed, applied
    posted_date DATE,
    deadline_date DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_jobs_status ON jobs(status);
CREATE INDEX idx_jobs_posted ON jobs(posted_date);

-- Job required skills junction
CREATE TABLE job_required_skills (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
    skill_id UUID NOT NULL REFERENCES skills(id) ON DELETE CASCADE,
    is_required BOOLEAN DEFAULT TRUE,  -- vs. nice-to-have
    importance_level INTEGER,  -- 1-5 scale

    CONSTRAINT unique_job_skill UNIQUE(job_id, skill_id)
);

CREATE INDEX idx_job_skills_job ON job_required_skills(job_id);

-- Job matches table (results of Claude analysis)
CREATE TABLE job_matches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    resume_id UUID NOT NULL REFERENCES resumes(id) ON DELETE CASCADE,
    job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
    match_score INTEGER NOT NULL CHECK (match_score >= 0 AND match_score <= 100),
    recommendation VARCHAR(50) NOT NULL,  -- hire, interview, pass
    detailed_reasoning TEXT,
    matching_skills JSONB,  -- Array of matching skill names
    missing_skills JSONB,  -- Array of missing skill names
    transferable_skills JSONB,
    key_strengths JSONB,
    development_areas JSONB,
    analyzed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT unique_resume_job_match UNIQUE(resume_id, job_id)
);

CREATE INDEX idx_job_matches_resume ON job_matches(resume_id);
CREATE INDEX idx_job_matches_job ON job_matches(job_id);
CREATE INDEX idx_job_matches_score ON job_matches(match_score DESC);

-- Resume tailoring suggestions
CREATE TABLE tailoring_suggestions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    resume_id UUID NOT NULL REFERENCES resumes(id) ON DELETE CASCADE,
    job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
    suggested_summary TEXT,
    skills_order JSONB,  -- Ordered array of skill names
    experience_rewrites JSONB,  -- Map of role -> rewritten bullets
    keywords_to_add JSONB,
    sections_to_emphasize JSONB,
    sections_to_minimize JSONB,
    projects_to_highlight JSONB,
    overall_strategy TEXT,
    generated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT unique_resume_job_tailoring UNIQUE(resume_id, job_id)
);

CREATE INDEX idx_tailoring_resume ON tailoring_suggestions(resume_id);
CREATE INDEX idx_tailoring_job ON tailoring_suggestions(job_id);

-- Tailored resumes (generated versions for specific jobs)
CREATE TABLE tailored_resumes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    original_resume_id UUID NOT NULL REFERENCES resumes(id) ON DELETE CASCADE,
    job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
    tailoring_suggestion_id UUID REFERENCES tailoring_suggestions(id),
    file_path VARCHAR(500) NOT NULL,
    file_type VARCHAR(20) NOT NULL,
    status VARCHAR(50) DEFAULT 'draft',  -- draft, reviewed, submitted
    generated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    submitted_at TIMESTAMP,

    CONSTRAINT unique_tailored_resume UNIQUE(original_resume_id, job_id)
);

CREATE INDEX idx_tailored_resumes_original ON tailored_resumes(original_resume_id);
CREATE INDEX idx_tailored_resumes_job ON tailored_resumes(job_id);

-- Processing log (track Claude API usage and costs)
CREATE TABLE processing_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    operation_type VARCHAR(50) NOT NULL,  -- extract, match, tailor
    resume_id UUID REFERENCES resumes(id) ON DELETE SET NULL,
    job_id UUID REFERENCES jobs(id) ON DELETE SET NULL,
    model_used VARCHAR(100) NOT NULL,
    input_tokens INTEGER NOT NULL,
    output_tokens INTEGER NOT NULL,
    cache_read_tokens INTEGER DEFAULT 0,
    cache_write_tokens INTEGER DEFAULT 0,
    estimated_cost DECIMAL(10,6),
    processing_time_ms INTEGER,
    success BOOLEAN DEFAULT TRUE,
    error_message TEXT,
    processed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_processing_log_date ON processing_log(processed_at);
CREATE INDEX idx_processing_log_operation ON processing_log(operation_type);
```

### Key Design Principles

1. **Normalization**: Skills are normalized to prevent duplicates and enable powerful queries
2. **Versioning**: Multiple resume versions per candidate for different job types
3. **JSONB Usage**: Flexible storage for arrays and nested data (achievements, suggestions)
4. **Audit Trail**: Processing log tracks all Claude API usage for cost analysis
5. **Relationships**: Clear foreign keys enable complex queries for matching and analysis
6. **Indexes**: Strategic indexes on common query patterns (dates, scores, relationships)

### Example Queries

```sql
-- Find best matching candidates for a job
SELECT
    c.full_name,
    c.email,
    jm.match_score,
    jm.recommendation,
    jm.key_strengths
FROM job_matches jm
JOIN resumes r ON jm.resume_id = r.id
JOIN candidates c ON r.candidate_id = c.id
WHERE jm.job_id = 'target-job-uuid'
    AND jm.match_score >= 70
ORDER BY jm.match_score DESC;

-- Find candidates with specific skill combination
SELECT DISTINCT c.*
FROM candidates c
JOIN resumes r ON c.id = r.candidate_id
JOIN resume_skills rs ON r.id = rs.resume_id
JOIN skills s ON rs.skill_id = s.id
WHERE s.name IN ('Python', 'PostgreSQL', 'FastAPI')
    AND r.is_current = TRUE
GROUP BY c.id
HAVING COUNT(DISTINCT s.name) = 3;  -- Must have all 3 skills

-- Calculate total Claude API costs
SELECT
    DATE_TRUNC('day', processed_at) as date,
    operation_type,
    model_used,
    SUM(estimated_cost) as total_cost,
    SUM(input_tokens) as total_input_tokens,
    SUM(output_tokens) as total_output_tokens,
    COUNT(*) as operation_count
FROM processing_log
WHERE processed_at >= NOW() - INTERVAL '30 days'
GROUP BY DATE_TRUNC('day', processed_at), operation_type, model_used
ORDER BY date DESC, total_cost DESC;
```

## 6. Complete Integration Example

```python
import anthropic
import base64
from typing import List, Dict
import psycopg2
from psycopg2.extras import RealDictCursor
import json
from datetime import datetime
from pydantic import BaseModel

class ResumeProcessor:
    """Complete resume processing system integrating Claude API and PostgreSQL"""

    def __init__(self, anthropic_api_key: str, db_config: dict):
        self.client = anthropic.Anthropic(api_key=anthropic_api_key)
        self.db_config = db_config

    def get_db_connection(self):
        """Get PostgreSQL connection"""
        return psycopg2.connect(**self.db_config, cursor_factory=RealDictCursor)

    def upload_and_process_resume(
        self,
        candidate_email: str,
        pdf_path: str,
        version_name: str = "Primary"
    ) -> Dict:
        """Upload resume, extract data, store in database"""

        # 1. Upload to Claude Files API
        with open(pdf_path, "rb") as pdf_file:
            uploaded_file = self.client.files.upload(
                file=pdf_file,
                purpose="resume_processing"
            )

        # 2. Extract structured data
        resume_data = self._extract_resume_data(uploaded_file.id)

        # 3. Store in database
        with self.get_db_connection() as conn:
            with conn.cursor() as cur:
                # Create or get candidate
                cur.execute("""
                    INSERT INTO candidates (email, full_name, phone, location, total_years_experience)
                    VALUES (%(email)s, %(full_name)s, %(phone)s, %(location)s, %(total_years_experience)s)
                    ON CONFLICT (email)
                    DO UPDATE SET
                        full_name = EXCLUDED.full_name,
                        phone = EXCLUDED.phone,
                        location = EXCLUDED.location,
                        total_years_experience = EXCLUDED.total_years_experience,
                        updated_at = CURRENT_TIMESTAMP
                    RETURNING id
                """, {
                    'email': candidate_email,
                    'full_name': resume_data.full_name,
                    'phone': resume_data.phone,
                    'location': resume_data.location,
                    'total_years_experience': resume_data.total_years_experience
                })
                candidate_id = cur.fetchone()['id']

                # Create resume record
                cur.execute("""
                    INSERT INTO resumes (
                        candidate_id, version_name, file_path, file_type,
                        claude_file_id, summary, processed_at
                    ) VALUES (
                        %(candidate_id)s, %(version_name)s, %(file_path)s, 'pdf',
                        %(claude_file_id)s, %(summary)s, CURRENT_TIMESTAMP
                    )
                    RETURNING id
                """, {
                    'candidate_id': candidate_id,
                    'version_name': version_name,
                    'file_path': pdf_path,
                    'claude_file_id': uploaded_file.id,
                    'summary': resume_data.summary
                })
                resume_id = cur.fetchone()['id']

                # Store skills
                for skill_name in resume_data.technical_skills + resume_data.soft_skills:
                    category = 'technical' if skill_name in resume_data.technical_skills else 'soft'

                    # Create skill if not exists
                    cur.execute("""
                        INSERT INTO skills (name, category)
                        VALUES (%(name)s, %(category)s)
                        ON CONFLICT (name) DO UPDATE SET name = EXCLUDED.name
                        RETURNING id
                    """, {'name': skill_name, 'category': category})
                    skill_id = cur.fetchone()['id']

                    # Link skill to resume
                    cur.execute("""
                        INSERT INTO resume_skills (resume_id, skill_id)
                        VALUES (%(resume_id)s, %(skill_id)s)
                        ON CONFLICT (resume_id, skill_id) DO NOTHING
                    """, {'resume_id': resume_id, 'skill_id': skill_id})

                # Store work experience
                for exp in resume_data.work_experience:
                    cur.execute("""
                        INSERT INTO work_experience (
                            resume_id, company_name, role_title, start_date,
                            end_date, is_current, description, achievements
                        ) VALUES (
                            %(resume_id)s, %(company)s, %(role)s, %(start_date)s,
                            %(end_date)s, %(is_current)s,
                            %(responsibilities)s, %(achievements)s
                        )
                    """, {
                        'resume_id': resume_id,
                        'company': exp.company,
                        'role': exp.role,
                        'start_date': exp.start_date,
                        'end_date': exp.end_date,
                        'is_current': exp.end_date is None,
                        'responsibilities': '\n'.join(exp.responsibilities),
                        'achievements': json.dumps(exp.achievements)
                    })

                # Store education
                for edu in resume_data.education:
                    cur.execute("""
                        INSERT INTO education (
                            resume_id, institution_name, degree,
                            field_of_study, graduation_date, gpa
                        ) VALUES (
                            %(resume_id)s, %(institution)s, %(degree)s,
                            %(field)s, %(grad_date)s, %(gpa)s
                        )
                    """, {
                        'resume_id': resume_id,
                        'institution': edu.institution,
                        'degree': edu.degree,
                        'field': edu.field_of_study,
                        'grad_date': edu.graduation_date,
                        'gpa': edu.gpa
                    })

                conn.commit()

                return {
                    'candidate_id': candidate_id,
                    'resume_id': resume_id,
                    'claude_file_id': uploaded_file.id
                }

    def match_resume_to_jobs(self, resume_id: str, job_ids: List[str] = None) -> List[Dict]:
        """Match a resume against jobs and store results"""

        with self.get_db_connection() as conn:
            with conn.cursor() as cur:
                # Get resume file ID
                cur.execute("SELECT claude_file_id FROM resumes WHERE id = %s", (resume_id,))
                resume_file_id = cur.fetchone()['claude_file_id']

                # Get jobs to match
                if job_ids:
                    cur.execute(
                        "SELECT id, description FROM jobs WHERE id = ANY(%s)",
                        (job_ids,)
                    )
                else:
                    cur.execute("SELECT id, description FROM jobs WHERE status = 'active'")

                jobs = cur.fetchall()
                results = []

                for job in jobs:
                    # Perform matching with Claude
                    match_result = self._match_with_claude(resume_file_id, job['description'])

                    # Store match results
                    cur.execute("""
                        INSERT INTO job_matches (
                            resume_id, job_id, match_score, recommendation,
                            detailed_reasoning, matching_skills, missing_skills,
                            transferable_skills, key_strengths, development_areas
                        ) VALUES (
                            %(resume_id)s, %(job_id)s, %(match_score)s, %(recommendation)s,
                            %(reasoning)s, %(matching_skills)s, %(missing_skills)s,
                            %(transferable_skills)s, %(key_strengths)s, %(development_areas)s
                        )
                        ON CONFLICT (resume_id, job_id)
                        DO UPDATE SET
                            match_score = EXCLUDED.match_score,
                            recommendation = EXCLUDED.recommendation,
                            detailed_reasoning = EXCLUDED.detailed_reasoning,
                            matching_skills = EXCLUDED.matching_skills,
                            missing_skills = EXCLUDED.missing_skills,
                            transferable_skills = EXCLUDED.transferable_skills,
                            key_strengths = EXCLUDED.key_strengths,
                            development_areas = EXCLUDED.development_areas,
                            analyzed_at = CURRENT_TIMESTAMP
                    """, {
                        'resume_id': resume_id,
                        'job_id': job['id'],
                        'match_score': match_result.match_score,
                        'recommendation': match_result.recommendation,
                        'reasoning': match_result.detailed_reasoning,
                        'matching_skills': json.dumps(match_result.matching_skills),
                        'missing_skills': json.dumps(match_result.missing_skills),
                        'transferable_skills': json.dumps(match_result.transferable_skills),
                        'key_strengths': json.dumps(match_result.key_strengths),
                        'development_areas': json.dumps(match_result.development_areas)
                    })

                    results.append({
                        'job_id': job['id'],
                        'match_score': match_result.match_score,
                        'recommendation': match_result.recommendation
                    })

                conn.commit()
                return results

    def generate_tailored_resume(self, resume_id: str, job_id: str) -> Dict:
        """Generate tailoring suggestions for specific job"""

        with self.get_db_connection() as conn:
            with conn.cursor() as cur:
                # Get resume and job data
                cur.execute("""
                    SELECT r.claude_file_id, j.description
                    FROM resumes r, jobs j
                    WHERE r.id = %s AND j.id = %s
                """, (resume_id, job_id))

                data = cur.fetchone()
                resume_file_id = data['claude_file_id']
                job_description = data['description']

                # Get tailoring suggestions from Claude
                suggestions = self._get_tailoring_suggestions(resume_file_id, job_description)

                # Store suggestions
                cur.execute("""
                    INSERT INTO tailoring_suggestions (
                        resume_id, job_id, suggested_summary, skills_order,
                        experience_rewrites, keywords_to_add, sections_to_emphasize,
                        sections_to_minimize, projects_to_highlight, overall_strategy
                    ) VALUES (
                        %(resume_id)s, %(job_id)s, %(summary)s, %(skills_order)s,
                        %(rewrites)s, %(keywords)s, %(emphasize)s,
                        %(minimize)s, %(projects)s, %(strategy)s
                    )
                    ON CONFLICT (resume_id, job_id)
                    DO UPDATE SET
                        suggested_summary = EXCLUDED.suggested_summary,
                        skills_order = EXCLUDED.skills_order,
                        experience_rewrites = EXCLUDED.experience_rewrites,
                        keywords_to_add = EXCLUDED.keywords_to_add,
                        sections_to_emphasize = EXCLUDED.sections_to_emphasize,
                        sections_to_minimize = EXCLUDED.sections_to_minimize,
                        projects_to_highlight = EXCLUDED.projects_to_highlight,
                        overall_strategy = EXCLUDED.overall_strategy,
                        generated_at = CURRENT_TIMESTAMP
                    RETURNING id
                """, {
                    'resume_id': resume_id,
                    'job_id': job_id,
                    'summary': suggestions.suggested_summary,
                    'skills_order': json.dumps(suggestions.skills_order),
                    'rewrites': json.dumps(suggestions.experience_rewrites),
                    'keywords': json.dumps(suggestions.keywords_to_add),
                    'emphasize': json.dumps(suggestions.sections_to_emphasize),
                    'minimize': json.dumps(suggestions.sections_to_minimize),
                    'projects': json.dumps(suggestions.projects_to_highlight),
                    'strategy': suggestions.overall_strategy
                })

                suggestion_id = cur.fetchone()['id']
                conn.commit()

                return {
                    'suggestion_id': suggestion_id,
                    'suggestions': suggestions
                }

    def _extract_resume_data(self, file_id: str) -> ResumeData:
        """Extract structured data from resume (implementation from earlier)"""
        # Implementation using structured outputs as shown in section 3
        pass

    def _match_with_claude(self, resume_file_id: str, job_description: str) -> JobMatch:
        """Perform job matching with Claude (implementation from earlier)"""
        # Implementation using job matching prompt as shown in section 3
        pass

    def _get_tailoring_suggestions(self, resume_file_id: str, job_description: str) -> TailoringRecommendations:
        """Get tailoring recommendations from Claude (implementation from earlier)"""
        # Implementation using tailoring prompt as shown in section 3
        pass

# Usage example
processor = ResumeProcessor(
    anthropic_api_key="your-api-key",
    db_config={
        'host': 'localhost',
        'database': 'resume_db',
        'user': 'your_user',
        'password': 'your_password'
    }
)

# Process a new resume
result = processor.upload_and_process_resume(
    candidate_email="john.doe@example.com",
    pdf_path="/path/to/resume.pdf",
    version_name="Software Engineer"
)

# Match against all active jobs
matches = processor.match_resume_to_jobs(result['resume_id'])

# Generate tailoring suggestions for top match
if matches:
    best_match = max(matches, key=lambda x: x['match_score'])
    suggestions = processor.generate_tailored_resume(
        result['resume_id'],
        best_match['job_id']
    )
```

## 7. Comparing Claude Against Alternatives

### Claude vs GPT-4/GPT-4o

| Aspect | Claude 3.5+ Sonnet | GPT-4o | Winner |
|--------|-------------------|--------|---------|
| **PDF Processing** | Native, vision-based (beta) | Requires OCR extraction first | Claude |
| **Structured Output** | JSON Schema with constrained decoding | JSON mode, less strict | Claude |
| **Context Window** | 200K standard, 1M extended | 128K standard | Claude |
| **Cost (Sonnet 4.5 vs GPT-4o)** | $3/$15 per 1M tokens | $2.50/$10 per 1M tokens | GPT-4o (cheaper) |
| **Prompt Caching** | 90% discount, 5min TTL | 50% discount, 1hr TTL | GPT-4o (longer cache) |
| **Reasoning Quality** | Excellent for structured tasks | Excellent, more creative | Tie |
| **Speed** | Fast | Fast | Tie |
| **Hallucination** | Lower rate | Moderate | Claude |
| **Ecosystem** | Growing | Established | GPT-4o |

**Recommendation**: Claude is superior for document-heavy workflows (resumes, contracts) due to native PDF support and structured outputs. GPT-4o is slightly cheaper and has better caching TTL.

### Claude vs Gemini 2.5 Pro

| Aspect | Claude 3.5+ Sonnet | Gemini 2.5 Pro | Winner |
|--------|-------------------|----------------|---------|
| **Document Parsing** | Excellent | Best-in-class for complex docs | Gemini |
| **Table/Chart Extraction** | Good | Excellent (preserves structure) | Gemini |
| **Cost** | $3/$15 per 1M tokens | Similar pricing | Tie |
| **Structured Output** | JSON Schema guaranteed | JSON mode | Claude |
| **Resume Parsing** | Excellent | Excellent | Tie |
| **API Maturity** | Mature | Mature | Tie |

**Recommendation**: For complex resumes with tables, charts, and intricate formatting, Gemini 2.5 Pro may have edge. For most resume parsing with guaranteed structure, Claude is excellent choice.

### Claude vs Dedicated Resume Parsers

| Aspect | Claude API | Dedicated Parsers (e.g., HireAble, Sovren) | Winner |
|--------|------------|-------------------------------------------|---------|
| **Setup Complexity** | API integration | API integration, specialized | Similar |
| **Accuracy** | 85-95% (with good prompts) | 90-98% (trained on resumes) | Dedicated |
| **Flexibility** | Extremely high, customizable | Limited to parser capabilities | Claude |
| **Cost** | Pay per token (~$0.01-0.03/resume) | Subscription or per-parse ($0.10-1.00/resume) | Claude |
| **Job Matching** | Excellent with custom logic | Limited or separate feature | Claude |
| **Resume Tailoring** | Excellent, native capability | Not available | Claude |
| **Learning Curve** | Prompt engineering required | Out-of-box | Dedicated |
| **Maintenance** | Minimal, prompt updates | Vendor-dependent | Claude |

**Recommendation**:
- **Use Dedicated Parsers** if you need maximum accuracy for standard resume fields, processing 1000s/day, and don't need custom analysis
- **Use Claude** if you need flexibility, job matching, resume tailoring, custom analysis, or have budget constraints

### Hybrid Approach (Recommended for Production)

```python
class HybridResumeProcessor:
    """Combine dedicated parser for extraction + Claude for analysis"""

    def process_resume_hybrid(self, pdf_path: str, job_description: str):
        # Step 1: Use dedicated parser for reliable field extraction
        basic_data = self.dedicated_parser.parse(pdf_path)

        # Step 2: Use Claude for nuanced analysis and matching
        match_analysis = self.claude_analyze(basic_data, job_description)

        # Step 3: Use Claude for tailoring suggestions
        tailoring = self.claude_tailor(basic_data, job_description)

        return {
            'basic_data': basic_data,      # High accuracy extraction
            'match_analysis': match_analysis,  # Nuanced reasoning
            'tailoring': tailoring          # Creative suggestions
        }
```

**Benefits of Hybrid**:
- 95%+ accuracy on standard fields (dedicated parser)
- Sophisticated matching and reasoning (Claude)
- Cost-effective (parser for extraction, Claude for value-add)
- Best of both worlds

## 8. Best Practices Summary

### Technical Implementation

1. **Use Files API for Production**
   - Upload resumes once, reference by ID
   - Reduces bandwidth and costs
   - Enable citations for better context

2. **Implement Prompt Caching**
   - Cache resumes when matching against multiple jobs
   - Cache job descriptions when matching multiple candidates
   - 90% cost savings on repeated content

3. **Leverage Batch API for Bulk Operations**
   - Process multiple resumes overnight with 50% discount
   - Ideal for daily job matching runs
   - Non-blocking, results available later

4. **Use Structured Outputs with Pydantic**
   - Define schemas as Pydantic models
   - Guaranteed JSON validity, no retry loops
   - Type-safe throughout application

5. **Model Selection Strategy**
   - Haiku 4.5: Simple extractions, quick checks
   - Sonnet 4.5: Most resume processing (balanced)
   - Opus 4.5: Complex analysis, tailoring, edge cases

### Data Management

6. **Normalize Skills in Database**
   - Prevent duplicates, enable powerful queries
   - Build skill taxonomy over time
   - Link skills to jobs and experiences

7. **Version Resumes**
   - Support multiple resume variants per candidate
   - Track which version used for each application
   - Enable A/B testing of resume styles

8. **Log All API Usage**
   - Track costs, tokens, performance
   - Monitor accuracy over time
   - Debug issues with historical data

9. **Use JSONB for Flexible Data**
   - Store arrays, nested objects efficiently
   - Query with PostgreSQL JSONB operators
   - Balance structure with flexibility

### Operational Excellence

10. **Prepare Documents Properly**
    - Convert DOCX to PDF for full visual understanding
    - Use OCR for scanned documents
    - Clean up formatting issues before upload

11. **Iterate on Prompts**
    - Test prompts on diverse resume samples
    - Gather feedback on extraction accuracy
    - Continuously refine based on results

12. **Handle Errors Gracefully**
    - Implement retry logic for API failures
    - Validate extracted data before storage
    - Log errors for debugging

13. **Monitor Costs**
    - Set budget alerts
    - Track cost per resume, per job match
    - Optimize prompts to reduce token usage

14. **Comply with Privacy Regulations**
    - Store resumes securely
    - Implement data retention policies
    - Get candidate consent for AI processing
    - Consider GDPR/CCPA requirements

## 9. Getting Started Checklist

- [ ] Sign up for Claude API, get API key
- [ ] Set up PostgreSQL database with schema
- [ ] Install dependencies: `anthropic`, `psycopg2`, `pydantic`
- [ ] Implement basic resume upload and extraction
- [ ] Test structured output with sample resumes
- [ ] Implement prompt caching for cost savings
- [ ] Build job matching logic
- [ ] Add resume tailoring feature
- [ ] Set up monitoring and logging
- [ ] Test with diverse resume formats
- [ ] Optimize prompts based on results
- [ ] Implement error handling and retry logic
- [ ] Add rate limiting and cost controls
- [ ] Deploy to production environment

## 10. Additional Resources

### Official Documentation
- [Claude PDF Support](https://docs.anthropic.com/en/docs/build-with-claude/pdf-support)
- [Claude Files API](https://platform.claude.com/docs/en/build-with-claude/files)
- [Structured Outputs](https://platform.claude.com/docs/en/build-with-claude/structured-outputs)
- [Claude Pricing](https://platform.claude.com/docs/en/about-claude/pricing)

### Example Implementations
- [Anthropic Cookbook - PDF Upload](https://github.com/anthropics/anthropic-cookbook/blob/main/misc/pdf_upload_summarization.ipynb)
- [Building AI Resume Job Matching App](https://www.firecrawl.dev/blog/ai-resume-parser-job-matcher-python)
- [Extracting Structured Data from PDFs](https://tarkalabs.com/blogs/extracting-structured-data/)

### Comparison Articles
- [Document Parsing: GPT-4o vs Claude Sonnet 3.5](https://www.invofox.com/en/post/document-parsing-using-gpt-4o-api-vs-claude-sonnet-3-5-api-vs-invofox-api-with-code-samples)
- [Claude vs GPT: 2026 Detailed Comparison](https://www.clickittech.com/ai/claude-vs-gpt/)
- [5 Best Document Parsers in 2026](https://www.f22labs.com/blogs/5-best-document-parsers-in-2025-tested/)

---

**Document Version**: 1.0
**Last Updated**: 2026-02-02
**Research Date**: 2026-02-02

## Sources

- [Document Parsing using GPT-4o API vs Claude Sonnet 3.5](https://www.invofox.com/en/post/document-parsing-using-gpt-4o-api-vs-claude-sonnet-3-5-api-vs-invofox-api-with-code-samples)
- [Claude 3.5 Sonnet Model Adds PDF File Processing](https://www.aibase.com/news/12953)
- [PDF support - Claude API Docs](https://simonwillison.net/2024/Nov/1/claude-api-pdf-support-beta/)
- [PDF support - Official Docs](https://docs.anthropic.com/en/docs/build-with-claude/pdf-support)
- [Using Claude for Reading PDFs - Web Interface and API](https://www.datastudios.org/post/using-claude-for-reading-summarizing-and-extracting-data-from-pdf-files-for-web-interface-and-api)
- [PDF support - Platform Docs](https://platform.claude.com/docs/en/build-with-claude/pdf-support)
- [Claude AI File Uploading & Reading Capabilities](https://www.datastudios.org/post/claude-ai-file-uploading-reading-capabilities-detailed-overview)
- [Files API - Claude API Docs](https://platform.claude.com/docs/en/build-with-claude/files)
- [Vision - Claude API Docs](https://platform.claude.com/docs/en/build-with-claude/vision)
- [What Kind of Files does Claude Allow](https://www.cometapi.com/what-kind-of-files-does-claude-allow-me-to-upload/)
- [Top 25 Claude Resume Prompts 2025](https://blog.theinterviewguys.com/claude-resume-prompts/)
- [AI Resume Job Matching App With Firecrawl And Claude](https://www.firecrawl.dev/blog/ai-resume-parser-job-matcher-python)
- [Claude Skills - resume-manager](https://claude-plugins.dev/skills/@ailabs-393/ai-labs-claude-skills/resume-manager)
- [Claude Skill for Knowledge Extraction](https://medium.com/data-science-collective/i-created-a-claude-skill-that-turns-piles-of-messy-documents-media-into-a-structured-report-19e9950f93b2)
- [Pricing - Claude API Docs](https://platform.claude.com/docs/en/about-claude/pricing)
- [Claude API Pricing Guide 2026](https://www.aifreeapi.com/en/posts/claude-api-pricing-per-million-tokens)
- [Claude AI Pricing 2026: Ultimate Guide](https://www.glbgpt.com/hub/claude-ai-pricing-2026-the-ultimate-guide-to-plans-api-costs-and-limits/)
- [Claude Pricing Explained: Subscription Plans & API Costs](https://intuitionlabs.ai/articles/claude-pricing-plans-api-costs)
- [Anthropic Claude API Pricing 2026](https://www.metacto.com/blogs/anthropic-api-pricing-a-full-breakdown-of-costs-and-integration)
- [Structured outputs - Claude API Docs](https://platform.claude.com/docs/en/build-with-claude/structured-outputs)
- [Anthropic Launches Structured Outputs](https://techbytes.app/posts/claude-structured-outputs-json-schema-api/)
- [Claude API Structured Output Guide](https://thomas-wiegold.com/blog/claude-api-structured-output/)
- [Hands-On with Anthropic's Structured Output](https://towardsdatascience.com/hands-on-with-anthropics-new-structured-output-capabilities/)
- [Best Practices for Database Schema Design in PostgreSQL](https://reintech.io/blog/best-practices-database-schema-design-postgresql)
- [PostgreSQL Schema Design Best Practices](https://www.graphile.org/postgraphile/postgresql-schema-design/)
- [claude-cookbooks/pdf_upload_summarization.ipynb](https://github.com/anthropics/anthropic-cookbook/blob/main/misc/pdf_upload_summarization.ipynb)
- [Claude AI and File Upload Capabilities Guide](https://www.datastudios.org/post/claude-ai-and-file-upload-capabilities-a-practical-guide-to-document-analysis-with-anthropic-s-llm)
- [Introducing the New Anthropic PDF Processing API](https://towardsdatascience.com/introducing-the-new-anthropic-pdf-processing-api-0010657f595f/)
- [Claude vs GPT: A 2026 Detailed Comparison](https://www.clickittech.com/ai/claude-vs-gpt/)
- [ChatGPT vs Gemini vs Claude: How to Choose](https://nutstudio.imyfone.com/llm-tips/chatgpt-vs-gemini-vs-claude/)
- [5 Best Document Parsers in 2026](https://www.f22labs.com/blogs/5-best-document-parsers-in-2025-tested/)
- [Claude 4 vs GPT-4o: Which LLM Is Best](https://learn.ryzlabs.com/llm-development/claude-4-vs-gpt-4o-which-llm-is-best-for-commercial-use-in-2026)
