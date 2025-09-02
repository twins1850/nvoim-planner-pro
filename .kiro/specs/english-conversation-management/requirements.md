# Requirements Document

## Introduction

앤보임 영어회화 자동화 관리 시스템은 플래너가 카카오톡을 통해 수행하던 수강생 관리, 숙제 배정, 피드백 제공 업무를 전용 모바일 앱으로 자동화하는 시스템입니다. 핵심 혁신은 90MB 동영상 파일에서 5-10MB 음성 파일을 추출하여 AI 기반 분석을 수행함으로써 비용을 90% 절감하면서도 효과적인 학습 관리를 제공하는 것입니다.

## Requirements

### Requirement 1

**User Story:** As a 플래너, I want to upload MP4 lesson recordings and automatically extract audio for analysis, so that I can efficiently analyze student performance without managing large video files.

#### Acceptance Criteria

1. WHEN a planner uploads an MP4 file (up to 90MB) THEN the system SHALL automatically extract audio to MP3 format (5-10MB)
2. WHEN audio extraction is complete THEN the system SHALL automatically delete the original MP4 file to save storage space
3. WHEN uploading a file THEN the system SHALL display upload progress and processing status
4. WHEN a file is uploaded THEN the system SHALL automatically recognize student name and lesson date from filename
5. IF audio extraction fails THEN the system SHALL notify the planner and retain the original file for retry

### Requirement 2

**User Story:** As a 플래너, I want AI-powered analysis of extracted audio files, so that I can understand student participation, pronunciation accuracy, and areas for improvement without manual review.

#### Acceptance Criteria

1. WHEN audio is extracted THEN the system SHALL automatically separate teacher and student speech segments
2. WHEN analyzing student speech THEN the system SHALL evaluate pronunciation accuracy, fluency, and participation level
3. WHEN analysis is complete THEN the system SHALL identify repeated learning areas and improvement points
4. WHEN generating analysis results THEN the system SHALL create automatic lesson notes based on the findings
5. WHEN analysis fails THEN the system SHALL provide fallback manual analysis options

### Requirement 3

**User Story:** As a 플래너, I want to schedule and send customized homework assignments automatically, so that I can manage multiple students efficiently without real-time messaging constraints.

#### Acceptance Criteria

1. WHEN creating homework THEN the system SHALL support scheduled sending by time and day of week
2. WHEN assigning homework THEN the system SHALL support both individual and group assignments
3. WHEN lesson analysis is complete THEN the system SHALL automatically generate personalized homework based on identified weak points
4. WHEN creating assignments THEN the system SHALL support multimedia attachments (audio, image, text)
5. WHEN homework is due THEN the system SHALL automatically send reminder notifications

### Requirement 4

**User Story:** As a 학생, I want to submit homework through various formats and receive immediate AI feedback, so that I can learn efficiently and track my progress.

#### Acceptance Criteria

1. WHEN submitting homework THEN the system SHALL support audio recording with high-quality capture
2. WHEN submitting homework THEN the system SHALL support text input and image upload
3. WHEN audio homework is submitted THEN the system SHALL provide pronunciation evaluation using Microsoft Azure Speech Service
4. WHEN text homework is submitted THEN the system SHALL provide grammar correction and vocabulary assessment
5. WHEN homework is submitted THEN the system SHALL show submission status and deadline information

### Requirement 5

**User Story:** As a 플래너, I want an integrated feedback system with AI pre-evaluation, so that I can provide consistent, high-quality feedback efficiently across all students.

#### Acceptance Criteria

1. WHEN student homework is submitted THEN the system SHALL perform AI-based initial evaluation
2. WHEN AI evaluation is complete THEN the system SHALL present results to planner for final review and approval
3. WHEN providing feedback THEN the system SHALL support audio, text, and image feedback formats
4. WHEN evaluating THEN the system SHALL apply standardized assessment criteria consistently
5. WHEN feedback is provided THEN the system SHALL maintain complete feedback history for each student

### Requirement 6

**User Story:** As a 학생, I want to track my learning progress and receive personalized notifications, so that I can stay motivated and manage my study schedule effectively.

#### Acceptance Criteria

1. WHEN logging into the app THEN the system SHALL display current homework status and upcoming deadlines
2. WHEN feedback is available THEN the system SHALL send push notifications to inform students
3. WHEN viewing progress THEN the system SHALL provide visual progress tracking and achievement badges
4. WHEN milestones are reached THEN the system SHALL provide motivational feedback and rewards
5. WHEN assignments are overdue THEN the system SHALL send appropriate reminder notifications

### Requirement 7

**User Story:** As a 플래너, I want comprehensive student management and reporting capabilities, so that I can monitor overall class performance and make data-driven teaching decisions.

#### Acceptance Criteria

1. WHEN viewing dashboard THEN the system SHALL display student progress overview and class statistics
2. WHEN generating reports THEN the system SHALL provide detailed analytics on student performance trends
3. WHEN managing multiple students THEN the system SHALL support bulk operations for homework assignment and feedback
4. WHEN reviewing performance THEN the system SHALL highlight students requiring additional attention
5. WHEN exporting data THEN the system SHALL provide comprehensive learning reports for parents and administrators

### Requirement 8

**User Story:** As a system administrator, I want cost-effective and scalable infrastructure, so that the system can grow with user demand while maintaining reasonable operational costs.

#### Acceptance Criteria

1. WHEN processing audio files THEN the system SHALL optimize storage costs through automatic file size reduction (90MB → 5-10MB)
2. WHEN scaling user base THEN the system SHALL maintain per-student operational costs below 1,000 won/month at scale
3. WHEN using AI services THEN the system SHALL implement usage-based billing with budget controls per planner
4. WHEN system load increases THEN the system SHALL automatically scale infrastructure components
5. WHEN monitoring costs THEN the system SHALL provide real-time cost tracking and alerts for budget management
