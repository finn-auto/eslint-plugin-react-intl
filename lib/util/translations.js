/* eslint-disable no-sync */
const fs = require('fs');
const path = require('path');

/**
 * Map of locale file paths to keys and modified time
 *
 * @type {{string: {keys: { locale: string, values: Array }, mtime: number}}}
 */
const localeFilesKeys = {};

/**
 * Extract locale from filename
 *
 * @param {string} fileName - Filename
 * @returns {string} - Localename
 */
function getLocaleFromFileName(fileName) {
  const localePattern = /\/([A-Za-z-]+)\./;

  return localePattern.exec(fileName)[1];
}

/**
 * Get a list of ids keys from reading locale files
 * Keeps track of modified times and reloads if changed,; useful for realtime eslint in-editor
 *
 * @param {object} context - Context
 * @returns {{string: string[]}} results - Array of ids
 */
function getIntlIds(context) {
  const { localeFiles, projectRoot } = context.settings;

  if (!localeFiles) {
    throw new Error('localeFiles not in settings');
  }

  const results = {};

  localeFiles.forEach((f) => {
    const fullPath = projectRoot ? path.join(projectRoot, f) : f;
    const mtime = fs.lstatSync(fullPath).mtime.getTime();
    if (
      !localeFilesKeys[fullPath] ||
      mtime !== localeFilesKeys[fullPath].mtime
    ) {
      const json = JSON.parse(fs.readFileSync(fullPath));
      localeFilesKeys[fullPath] = {
        locale: getLocaleFromFileName(f),
        keys: Object.keys(json),
        mtime: mtime
      };
    }
    const localeFileKeys = localeFilesKeys[fullPath];
    results[localeFileKeys.locale] = [...localeFileKeys.keys];
  });

  return results;
}

module.exports = {
  getIntlIds
};
