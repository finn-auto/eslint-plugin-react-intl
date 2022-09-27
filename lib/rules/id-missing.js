const {
  sortedTemplateElements,
  templateLiteralDisplayStr
} = require('../util/templateLiterals');
const { getIntlIds } = require('../util/translations');
const {
  findFormatMessageAttrNode,
  findFormattedMessageAttrNode,
  findAttrNodeInDefineMessages,
  findAttrNodeInDefineMessage
} = require('../util/findNodes');

// ------------------------------------------------------------------------------
// Rule Definition
// ------------------------------------------------------------------------------

module.exports = {
  meta: {
    docs: {
      description: 'Validates intl message ids are in locale file',
      category: 'Intl',
      recommended: true
    },
    fixable: null,
    schema: []
  },

  create: function (context) {
    const translatedIds = getIntlIds(context);
    const localeTranslatedIds = Object.keys(translatedIds).map((locale) => ({
      locale,
      translatedIds: new Set(translatedIds[locale])
    }));

    // ----------------------------------------------------------------------
    // Helpers
    // ----------------------------------------------------------------------

    function checkIsLiteralTranslated(id) {
      return localeTranslatedIds.map((locale) => ({
        locale: locale.locale,
        isTranslated: locale.translatedIds.has(id)
      }));
    }

    function checkIsTemplateTranslated(re) {
      return localeTranslatedIds.map((locale) => ({
        locale: locale.locale,
        isTranslated: Array.from(locale.translatedIds).some((k) => re.test(k))
      }));
    }

    function processLiteral(node) {
      const locales = checkIsLiteralTranslated(node.value);

      const missingTranslations = locales.filter(
        (locale) => !locale.isTranslated
      );
      if (missingTranslations.length) {
        const missingLocales = missingTranslations
          .map((locale) => locale.locale)
          .join(', ');

        context.report({
          node: node,
          message: 'Missing id: ' + node.value + ` in ${missingLocales}`
        });
      }
    }

    function processTemplateLiteral(node) {
      const exStr = sortedTemplateElements(node)
        .map((e) => (!e.value ? '.*' : e.value.raw))
        .join('');
      const re = new RegExp(exStr);

      const locales = checkIsTemplateTranslated(re);

      const missingTranslations = locales.filter(
        (locale) => !locale.isTranslated
      );
      if (missingTranslations.length) {
        const missingLocales = missingTranslations
          .map((locale) => locale.locale)
          .join(', ');

        context.report({
          node: node,
          message:
            'Missing id pattern: ' +
            templateLiteralDisplayStr(node) +
            ` in ${missingLocales}`
        });
      }
    }

    function processAttrNode(node) {
      if (node.value.type === 'Literal') {
        return processLiteral(node.value);
      }
      if (
        node.value.type === 'JSXExpressionContainer' &&
        node.value.expression.type === 'TemplateLiteral'
      ) {
        return processTemplateLiteral(node.value.expression);
      }
      if (node.value.type === 'TemplateLiteral') {
        return processTemplateLiteral(node.value);
      }
    }

    // ----------------------------------------------------------------------
    // Public
    // ----------------------------------------------------------------------

    return {
      JSXIdentifier: function (node) {
        const attrNode = findFormattedMessageAttrNode(node, 'id');
        if (attrNode) return processAttrNode(attrNode);
      },
      CallExpression: function (node) {
        const attrNode = findFormatMessageAttrNode(node, 'id');
        if (attrNode) return processAttrNode(attrNode);
      },
      Property: function (node) {
        const attrNode =
          findAttrNodeInDefineMessages(node, 'id') ||
          findAttrNodeInDefineMessage(node, 'id');
        if (attrNode) return processAttrNode(attrNode);
      }
    };
  }
};
