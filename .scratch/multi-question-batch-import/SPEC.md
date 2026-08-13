## Problem Statement

Students often take photos of full-page test papers or homework sheets that contain multiple error questions. The current single-question photo identification flow requires students to take photos or upload images one question at a time, which is slow and inconvenient for batch error recording.

## Solution

Provide a multi-question batch import feature on the H5 mobile interface. The system uses LLM Vision capabilities to automatically detect and segment multiple questions on a full-page image, extract structured question text, detect duplicate questions against the student's existing repository, and render interactive cards for preview and selection. Students can adjust question attributes, select which questions to import, resolve duplicates, and perform a single-click batch import into their error repository with transactional consistency.

## User Stories

1. As a student, I want to upload a full-page test paper photo, so that the system can automatically identify and segment all questions on the page at once.
2. As a student, I want to see a list of identified question cards with bounding box thumbnails and extracted text, so that I can easily review the AI identification results.
3. As a student, I want duplicate questions (questions I have already recorded) to be clearly marked as "Already Recorded" and unchecked by default, so that I don't accidentally import duplicate error questions.
4. As a student, I want to be able to check an "Already Recorded" question and choose to override/update the existing question, so that I can update my error repository when I re-take a test.
5. As a student, I want each identified question card to allow independent adjustment of subject, question type, and difficulty, so that I can correct any AI classification mistakes before importing.
6. As a student, I want a modal crop preview tool when inspecting a question card, so that I can manually re-adjust the bounding region if the AI cut off part of a question.
7. As a student, I want to select multiple questions and click "Import Selected", so that all chosen error questions are saved to my repository in a single atomic operation.
8. As a parent or system administrator, I want multi-question identification token usage and latency to be tracked under a dedicated LLM scene (`multi_recognition`), so that cost and performance can be audited separately.

## Implementation Decisions

- **Multi-Question Segmentation & Identification**:
  - The API endpoint `POST /api/questions/identify-multi` accepts a full-page image upload.
  - The LLM Vision prompt instructs the model to return a structured JSON array containing bounding box coordinates (`x`, `y`, `width`, `height`), extracted title, content, type, subject, difficulty, and reference answer for each detected question.

- **Duplicate Checking & Conflict Resolution**:
  - During multi-question identification, the backend computes a normalized text fingerprint for each question and queries the student's existing questions.
  - Matching questions are returned with an `isDuplicate: true` flag and the `existingQuestionId`.
  - In the H5 interface, duplicate question cards are rendered with a warning badge and unchecked by default, but allow manual selection for optional override.

- **Atomic Batch Creation**:
  - The API endpoint `POST /api/questions/batch` accepts an array of selected questions.
  - The backend executes a database transaction to insert all questions and their corresponding initial `Mastery` records in a single All-or-Nothing operation.

- **LLM Scene & Observability**:
  - Extends `LLMScene` enum with `multi_recognition`.
  - All multi-question identification calls record token input/output, latency, and model details under `multi_recognition` in `llm_usage`.

- **Mobile H5 UI Interaction**:
  - Extends `AddQuestion.vue` with a multi-question batch mode tab.
  - Uses thumbnail card lists for zero-accidental-touch scrolling, and provides a modal crop dialog for fine-grained coordinate adjustment when needed.

## Testing Decisions

- **Testing Posture**: Tests will verify end-to-end HTTP behavior, payload validation, duplicate detection flags, and transactional database commits without depending on internal implementation details.
- **Backend API Integration Tests**:
  - Test `POST /api/questions/identify-multi` with mock LLM Vision responses to ensure array parsing and duplicate marking (`isDuplicate`).
  - Test `POST /api/questions/batch` to verify atomic insertion of multiple `Question` entities and their linked `Mastery` records within a database transaction.
  - Test transaction rollback on batch insertion failure.
- **Prior Art**: Mirrors existing integration test patterns in `backend/src/__tests__/controllers/QuestionController.test.ts` and `final-test.sh`.

## Out of Scope

- Real-time WebSockets or server-sent events for streaming multi-question recognition (uses standard synchronous HTTP).
- Desktop canvas multi-touch canvas dragging on the main page (uses modal crop dialog instead).
- Automatic PDF document multi-page parsing (operates on single image uploads per request).

## Further Notes

- Guided by Architectural Decision Records `ADR 0001` and `ADR 0002` in `docs/adr/`.
- Domain terminology aligned with `CONTEXT.md`.
