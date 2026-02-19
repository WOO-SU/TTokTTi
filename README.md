# RiskPulse
### ERD
```mermaid
erDiagram
    WORKSITE ||--o{ WORKSESSION : has
    WORKSESSION ||--o{ WORKSESSION_MEMBER : includes
    USER ||--o{ WORKSESSION_MEMBER : participates

    WORKSESSION ||--o{ COMPLIANCE : generates
    USER ||--o{ COMPLIANCE : checked

    WORKSESSION ||--o{ VIDEOLOG : generates
    RISK_TYPE ||--o{ VIDEOLOG : classifies

    VIDEOLOG ||--o{ VIDEOLOG_READ : read_status
    USER ||--o{ VIDEOLOG_READ : reads

    WORKSESSION ||--o{ PHOTO : has
    COMPLIANCE ||--o{ VIDEOLOG : related_to
    USER ||--o{ PHOTO : uploads

    WORKSESSION ||--o{ RISKASSESSMENT : generates
    RISKASSESSMENT ||--o{ RISKASSESSMENTIMAGE : has
    USER ||--o{ RISKASSESSMENT : creates

    RISKASSESSMENT ||--|| WORKERRECOMMENDATION : produces
    RISKASSESSMENT ||--|| RISKREPORT : produces

    USER {
        int id PK 
        VARCHAR username "id used for login"
        VARCHAR password "pw used for login"
        VARCHAR name "full name for each user"
        VARCHAR phone 
        VARCHAR address 
        VARCHAR birth_date 
        VARCHAR photo "path to blob storage"
        ENUM sex "['F', 'M']"
        BOOLEAN is_manager "true only for manager"
        BOOLEAN is_active "just for django auth"
        BOOLEAN is_staff  "just for django auth"
        DATETIME created_at
        DATETIME updated_at
    }
    WORKSITE {
        INT id PK
        VARCHAR name
        VARCHAR address
        DATETIME created_at
        DATETIME updated_at
    }

    WORKSESSION {
        INT id PK
        INT worksite_id FK
        VARCHAR name
        DATETIME starts_at
        DATETIME ends_at
        ENUM status "['READY', 'IN_PROGRESS', 'DONE']"
        VARCHAR fullcam_video "blob path to full fullcam video"
        VARCHAR bodycam_video "blob path to full bodycam video"
        DATETIME created_at
        DATETIME updated_at
    }

    WORKSESSION_MEMBER {
        INT id PK
        INT worksession_id FK
        INT user_id FK
        ENUM role "['HEAD', 'RELATED', 'WORKER']"
    }

    COMPLIANCE {
        INT id PK
        INT employee_id FK
        INT worksession_id FK
        ENUM category "['HELMET', 'VEST', 'SHOES']"
        BOOLEAN is_complied
        VARCHAR original_image "blob path"
        VARCHAR detected_image "blob path"
        DATETIME created_at
        DATETIME updated_at
    }

    RISK_TYPE {
        INT id PK
        VARCHAR code "used for model"
        VARCHAR name "used for UI"
        VARCHAR description
        ENUM camera_type "['BODY', 'FULL']"
        DATETIME created_at
        DATETIME updated_at
    }

    VIDEOLOG {
        INT id PK
        INT worksession_id FK
        INT risk_type_id FK
        INT compliance_id FK
        ENUM source "['AUTO', 'MANUAL']"
        ENUM status "['PENDING', 'APPROVED', 'REJECTED']"
        VARCHAR original_video "path to blob"
        DATETIME created_at
        DATETIME updated_at
    }

    VIDEOLOG_READ {
        INT id PK
        INT videolog_id FK
        INT user_id FK
        BOOLEAN is_read
        DATETIME read_at
    }

    PHOTO {
        INT id PK
        INT employee_id FK
        INT worksession_id FK
        ENUM status "['BEFORE', 'AFTER']"
        VARCHAR image_path "path to blob"
        DATETIME created_at
        DATETIME updated_at
    }
    
    RISKASSESSMENTIMAGE {
        INT id PK
        INT assessment_id FK
        VARCHAR blob_name
        DATETIME created_at
    }

    RISKASSESSMENT {
        INT id PK
        INT worksession_id FK
        ENUM status "['PENDING', 'COMPLETED', 'FAILED']"
        VARCHAR site_label "worksession.name"
        JSON llm_result
        VARCHAR overall_grade
        INT overall_max_R
        VARCHAR work_permission
        DATETIME created_at
    }

    WORKERRECOMMENDATION {
        INT id PK
        INT assessment_id FK
        JSON top_risks
        JSON immediate_actions
        VARCHAR short_message
        DATETIME generated_at
    }

    RISKREPORT {
        INT id PK
        INT assessment_id FK
        VARCHAR report_version 
        JSON scene_summary
        JSON hazards
        JSON overall
        DATETIME generatd_at
    }
    
```

---


### System Architecture
#### 1. detect worker's regulation compliance
<img width="981" height="594" alt="SystemArchitecture drawio-2" src="https://github.com/user-attachments/assets/59409773-a0dc-44d8-b3dd-a620c535c065" />

#### 2. detect + save full cam video 
<img width="1075" height="570" alt="SystemArchitecture-2 drawio" src="https://github.com/user-attachments/assets/6501c7a6-4727-445c-bd37-e3db8a4df281" />

#### 3. upload work-before image then create risk-assessment report
<img width="842" height="565" alt="SystemArchitecture-3 drawio" src="https://github.com/user-attachments/assets/a4f55f38-027f-4de8-936e-32f930f8384d" />

#### 4. detect + save body cam video
<img width="951" height="564" alt="SystemArchitecture-4 drawio" src="https://github.com/user-attachments/assets/3ef5a2e2-689d-42b3-b8b4-19f04da137e9" />


---
Last Updated: Feb 19, 2026
