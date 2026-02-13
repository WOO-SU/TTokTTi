# RiskPulse
### ERD
```mermaid
erDiagram
    USER }o--o{ TEAM : belongs_to
    USER ||--o{ COMPLIANCE : checked
    USER ||--o{ VIDEO : recorded
    USER {
        int id PK 
        char(20) username "id used for login"
        char(20) password "pw used for login"
        bool is_manager "true only for manager"
        char(20) name "full name for each user"
        char(20) phone "nullable"
        char(100) address "nullable"
        date birth_date "nullable"
        char(200) photo "nullable: path to blob storage"
        char(1) sex "F for female, M for male"
        date created_at
        date updated_at
    }
    COMPLIANCE {
        int id PK
        int employee_id FK
        bool is_complied "nullable"
        char(200) original_image "nullable: blob path to original image"
        char(200) detected_image "nullable: blob path to detected image"
        bool is_updated "is processed by model?"
        date created_at
        date updated_at
    }
    VIDEO {
        int id PK
        int employee_id FK
        bool is_risky "default = false"
        char(200) original_video "nullable: blob path to original video"
        char(4) camera_type "nullable: BODY or FULL"
        date created_at
        date updated_at
    }
    TEAM {
        int id PK
        int employee1_id FK
        int employee2_id FK
        date created_at
        date updated_at
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
Last Updated: Feb 13, 2026
