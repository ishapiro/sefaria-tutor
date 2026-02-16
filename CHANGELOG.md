# Changelog

All notable changes to Sefaria Word Explorer (Shoresh) are documented in this file.

---

## [Unreleased] – February 2026

### Admin Features

- **Default Translation Model** — Admins can now select the default GPT model used for translations system-wide. A new "Default Translation Model" section on the Admin page (`/admin`) lets administrators choose from available models and save the selection. The setting is stored in a new `system_settings` table and applies to the Word Explorer, Dictionary, and all translation API calls. Migration `0016_system_settings.sql` adds the table and seeds the default (`gpt-5.1-chat-latest`).

- **GPT Model Speed Test** — A new admin tool at the bottom of the Admin page allows testing translation speed across different models. Select a model from a dropdown, run the test (which uses the standard translation prompt with a typical Hebrew sentence), and compare response times. Results are tracked in a table so multiple models can be compared side by side.

### Translation Modal

- **Translation statistics** — The translation modal (Word Explorer and Dictionary) now displays at the bottom:
  - **From cache:** When the translation was served from the cache, it shows "Translation from cache."
  - **From API:** When translated live, it shows the GPT model used, number of words translated, total time (ms), and time per word (ms).

### My Word List

- **Example words (root examples)** — Word cards in My Word List now display "Additional examples with the same root" when the AI provided root examples (e.g., words sharing the same Hebrew root). Each example shows the Hebrew word and its translation, matching the format used in the translation dialog.

### Technical

- **System settings** — New `system_settings` table (D1) for admin-configurable system-wide settings. The `translation_default_model` key stores the default GPT model.
- **Admin APIs** — `GET /api/admin/default-model` and `PUT /api/admin/default-model` for reading and updating the default translation model. `GET /api/admin/openai/models-list` returns the list of available models for admin UI dropdowns.
- **Model resolution** — `GET /api/openai/model` and the translation chat API now respect the admin-configured default model when available, falling back to the code default when the database is unavailable or the setting is not set.
