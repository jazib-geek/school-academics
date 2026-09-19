/**
 * Spread onto filter/search text inputs to discourage browser & password-manager autofill.
 * Prefer non-login field names (avoid name="name", name="username", etc.).
 */
export const FILTER_INPUT_AUTOCOMPLETE_PROPS = {
  autoComplete: 'off',
  autoCorrect: 'off',
  autoCapitalize: 'off',
  spellCheck: false,
  'data-1p-ignore': 'true',
  'data-lpignore': 'true',
  'data-form-type': 'other',
}
