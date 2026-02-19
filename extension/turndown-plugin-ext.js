const TurndownPluginExt = (function (exports) {
    'use strict';

    function applyEscapes(value, escapeRules) {
        return escapeRules.reduce(function (accumulator, rule) {
            return accumulator.replace(rule[0], rule[1]);
        }, value);
    }

    function customEscapes(extraEscapeRules) {
        return function (turndownService) {
            const baseEscape = turndownService.escape.bind(turndownService);
            const normalizedRules = Array.isArray(extraEscapeRules) ? extraEscapeRules : [];

            turndownService.escape = function (value) {
                const escaped = baseEscape(value);
                return applyEscapes(escaped, normalizedRules);
            };
        };
    }

    // Use with TurndownService constructor options to place a single newline after block nodes.
    function optionsSingleBlockNewLine() {
        return {
            blankReplacement: function (_content, node) {
                return node.isBlock ? '\n' : '';
            },
            keepReplacement: function (_content, node) {
                return node.isBlock ? '\n' + node.outerHTML + '\n' : node.outerHTML;
            },
            defaultReplacement: function (content, node) {
                return node.isBlock ? '\n' + content + '\n' : content;
            }
        };
    }

    exports.customEscapes = customEscapes;
    exports.optionsSingleBlockNewLine = optionsSingleBlockNewLine;

    return exports;

}({}));
