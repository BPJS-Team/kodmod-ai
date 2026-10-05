import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import ts from "typescript";

const guidedTutorPath = new URL("../src/components/guided-tutor.tsx", import.meta.url);
const interactiveTags = new Set(["a", "button", "input", "select", "textarea", "Link", "Button", "Input", "Textarea", "NativeSelect"]);

test("guided Tutor does not nest interactive controls", () => {
  const source = ts.createSourceFile(guidedTutorPath.pathname, readFileSync(guidedTutorPath, "utf8"), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const violations = [];
  const isInteractive = opening => {
    const tagName = opening.tagName.getText(source);
    const role = opening.attributes.properties.find(attribute => ts.isJsxAttribute(attribute) && attribute.name.getText(source) === "role");
    const roleValue = role?.initializer && (ts.isStringLiteral(role.initializer)
      ? role.initializer.text
      : ts.isJsxExpression(role.initializer) && role.initializer.expression && ts.isStringLiteral(role.initializer.expression)
        ? role.initializer.expression.text
        : "");
    return interactiveTags.has(tagName) || roleValue === "button" || roleValue === "link";
  };
  const visit = (node, insideInteractive = false) => {
    if (ts.isJsxElement(node)) {
      const current = isInteractive(node.openingElement);
      if (insideInteractive && current) violations.push(`line ${source.getLineAndCharacterOfPosition(node.getStart(source)).line + 1}: ${node.openingElement.tagName.getText(source)}`);
      node.children.forEach(child => visit(child, insideInteractive || current));
      return;
    }
    if (ts.isJsxSelfClosingElement(node) && insideInteractive && isInteractive({ tagName: node.tagName, attributes: node.attributes })) {
      violations.push(`line ${source.getLineAndCharacterOfPosition(node.getStart(source)).line + 1}: ${node.tagName.getText(source)}`);
      return;
    }
    ts.forEachChild(node, child => visit(child, insideInteractive));
  };

  visit(source);
  assert.deepEqual(violations, [], "Interactive controls must be siblings, not nested inside each other");
});
