## Problem Statement

When students upload or photograph error questions from STEM subjects (mathematics, physics, chemistry), many questions rely on structural diagrams, geometry figures, function graphs, or circuit schematics. Currently, error questions store only the full-page photo (`imageUrl`), which often contains student handwriting, corrections, or notes that ruin the learning experience during re-do sessions or result in plain text without essential diagrams.

## Solution

Provide automatic question diagram extraction and fallback mechanisms during question recognition. The Vision LLM identifies diagram bounding boxes within the question region, and the backend automatically crops and stores these diagrams as an array of diagram URLs (`diagramUrls`). In question detail and online re-do interfaces, the system renders clean text/formulas alongside extracted diagrams, while keeping original full-page photos hidden behind collapsibles, guaranteeing a clean and effective re-do environment.

## User Stories

1. As a student, I want questions with geometric figures or physics diagrams to automatically extract clean diagram images upon recognition, so that I can clearly see the necessary figures without full-page photo clutter.
2. As a student, I want a single question with multiple figures (e.g. Figure 1 and Figure 2) to display all extracted diagrams in sequence, so that no critical problem context is missing.
3. As a student, I want questions without diagrams (pure text or text + formula) to hide the diagram section cleanly without empty image placeholders, so that the UI stays clean.
4. As a student, if diagram extraction fails due to invalid coordinates or model errors, I want the system to automatically fall back to cropping the question's local bounding region image, so that I never lose the diagram needed to solve the problem.
5. As a student during online re-do sessions, I want to see the extracted problem diagrams (`diagramUrls`) alongside the question text, while keeping full-page photos (`imageUrl`) completely hidden, so that I am not spoiled by handwritten answers or grading marks on the original photo.
6. As a student reviewing question details, I want reference answers, explanations, and full-page original photos to be collapsed by default, so that I can test myself before revealing the solutions.
7. As a student or system administrator, when I delete an error question, I want all associated diagram image files on disk to be asynchronously cleaned up, so that server disk space is not wasted.

## Implementation Decisions

- **Database & Entity Schema**:
  - Extend `Question` entity with `diagramUrls: string[]` (stored as JSON array in MariaDB/ORM).
  - Existing questions default `diagramUrls` to `[]` for full backward compatibility.

- **Vision Recognition & Diagram Cropping**:
  - Update `POST /api/questions/recognize` and `POST /api/questions/identify-multi` prompts to instruct LLM Vision to detect diagram bounding boxes `diagramBbox: [ymin, xmin, ymax, xmax]` relative to the question region.
  - Utilize Node.js `sharp` library to crop sub-images from uploaded photos and save them to `/uploads/diagrams/`.
  - Fallback logic: If `diagramBbox` is missing or invalid, crop the question's bounding box region as a single fallback diagram image.

- **Frontend Component & Page Adjustments**:
  - `QuestionDetail.vue` and `Redo.vue`: Render `diagramUrls` directly within the question card using `<van-image>`. Keep full-page `imageUrl` collapsed by default in `QuestionDetail.vue` and omitted from `Redo.vue`.
  - `AddQuestion.vue`: Include extracted `diagramUrls` in the preview form for student review before saving.

- **Cascade Disk File Cleanup**:
  - Update `QuestionController.deleteQuestion` to inspect `diagramUrls` and asynchronously remove corresponding image files from disk.

- **Prototype Reference**:
  - Prototype POC branch `prototype/diagram-extraction` (commit `20409e0`) verified structural JSON contract and bounding box coordinate validation.

## Testing Decisions

- **Testing Posture**: Focus tests on HTTP API contract, fallback execution when Bbox is invalid, and entity persistence.
- **Backend Tests**:
  - Integration tests in `QuestionController.test.ts` to verify `diagramUrls` parsing, JSON persistence, and fallback image generation.
  - Test cascade deletion logic ensuring disk cleanup.
- **Prior Art**: Mirrors integration test structures in `backend/src/__tests__/controllers/QuestionController.test.ts`.

## Out of Scope

- Drag-and-drop manual diagram cropping gesture tools on mobile H5 (reserved for V2.0 iteration).
- AI inpainting/eraser models for removing handwritten ink from cropped diagrams (uses raw crop fallback).

## Further Notes

- Aligned with Architectural Decision Record `ADR 0003` in `docs/adr/0003-question-diagram-extraction-and-fallback-architecture.md`.
- Glossary updated in `CONTEXT.md` with `Question Diagram` and `Diagram Fallback`.
