const path = require('path');

const ts = require('typescript');
const { Parser } = require('jsdoc/lib/jsdoc/src/parser');

function getNodeAsStringFromSrc(node, sourceText, trim = true) {
    const nodeText = sourceText.substring(node.pos, node.end);

    if (trim) {
        return nodeText.trim();
    }

    return nodeText;
}

function getObjMemberStrings(memberNode, sourceText, asSingleEntry = false) {
    // name = named object key
    // parameters = type of object key (e.g. `{ [key: string]: val }`)
    const key = memberNode.name || memberNode.parameters[0];
    const val = memberNode.type;

    const keyString = getNodeAsStringFromSrc(key, sourceText);
    const [ keyName, keyType ] = keyString.split(':').map(str => str.trim());
    const valType = getNodeAsStringFromSrc(val, sourceText);

    return asSingleEntry
        ? `${keyType || 'string'}, ${valType}`
        : `${keyName}: ${valType}`;
}

function convertTypeToString(type, sourceText) {
    if (type.members) {
        try {
            if (type.members.length === 1 && !type.members[0].name) {
                return `Object<${getObjMemberStrings(type.members[0], sourceText, true)}>`;
            } else {
                const objEntries = type.members.map(memberNode => getObjMemberStrings(memberNode, sourceText));

                return `{${objEntries.join(', ')}}`;
            }
        } catch (e) {
            return 'Object';
        }
    }

    return getNodeAsStringFromSrc(type, sourceText);
}

function getJsdocCommentForUnionType(tsNode, sourceText) {
    if (!ts.isTypeAliasDeclaration(tsNode)) {
        return;
    }

    const name = tsNode.name.escapedText;
    const jsDocNode = tsNode.jsDoc && tsNode.jsDoc[0];
    const isUnionType = ts.isUnionTypeNode(tsNode.type) || ts.isParenthesizedTypeNode(tsNode.type);

    if (!jsDocNode || !isUnionType) {
        return;
    }

    // e.g. type MyType = (string | number);
    const isTypeDeclarationNestedInParens = ts.isParenthesizedTypeNode(tsNode.type);
    let unionNodeType = tsNode.type;

    if (isTypeDeclarationNestedInParens) {
        unionNodeType = unionNodeType.type;
    }

    const unionTypes = unionNodeType.types;
    const typesAsStrings = unionTypes.map(type => convertTypeToString(type, sourceText));
    const jsdocTypedefVal = typesAsStrings.join('|');

    const jsdocWithoutTypeDef = getNodeAsStringFromSrc(jsDocNode, sourceText, false);
    const jsdocWithTypeDef = jsdocWithoutTypeDef.replace(/([\n\s]*)(\*\/)/, `$1* @typedef {${jsdocTypedefVal}} ${name}$1$2`);

    return {
        oldJsdoc: jsdocWithoutTypeDef,
        newJsdoc: jsdocWithTypeDef
    };
}


/** @type {Parser} */
exports.handlers = {
    beforeParse: function(event) {
        const { filename, source } = event;
        const fileExtension = path.extname(filename);

        if (!fileExtension.includes('.ts')) {
            return;
        }

        const ast = ts.createSourceFile(
            path.basename(filename),
            source,
            ts.ScriptTarget.Latest,
            false,
            ts.ScriptKind.TS
        );

        const jsdocsForUnionTypes = ast.statements
            .map(tsNode => getJsdocCommentForUnionType(tsNode, source))
            .filter(jsdoc => jsdoc);

        /*
         * Note: This plugin *must* be run before better-docs because better-docs
         * replaces `event.source`, causing the entire TS type definitions to be lost.
         * Thus, append the new JSDoc entry to the end of the file's contents so that
         * it remains even after better-docs removes the entire TS type definition.
         */
        event.source += jsdocsForUnionTypes.map(jsdoc => jsdoc.newJsdoc).join('\n');
    }
};
