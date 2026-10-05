import test from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import ts from "typescript";
import { english } from "../src/lib/i18n.mjs";

const list = folder => readdirSync(folder, { withFileTypes: true }).flatMap(entry => entry.isDirectory() ? list(join(folder, entry.name)) : [join(folder, entry.name)]);
const copyOnlyExceptions = new Set(["KODMOD", "English", "Bahasa Indonesia", "Username", "AI", "Admin"]);
test("explicit translated interface labels have English copy across current pages", () => {
  const missing = [];
  for (const file of list(fileURLToPath(new URL("../src", import.meta.url))).filter(file => /\.tsx?$/.test(file))) {
    const source = ts.createSourceFile(file, readFileSync(file, "utf8"), ts.ScriptTarget.Latest, true, file.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
    const check = value => { const key = value.trim().replace(/\s+/g, " "); if (key && !copyOnlyExceptions.has(key) && !Object.hasOwn(english, key)) missing.push(`${file}: ${key}`); };
    const literal = node => { if (!node) return; if (ts.isStringLiteral(node)) check(node.text); else if (ts.isConditionalExpression(node)) { literal(node.whenTrue); literal(node.whenFalse); } };
    const walk = node => {
      if (ts.isCallExpression(node) && /(?:^|\.)t$/.test(node.expression.getText(source))) literal(node.arguments[0]);
      if (ts.isJsxElement(node) && node.openingElement.tagName.getText(source) === "UiText") for (const child of node.children) { if (ts.isJsxText(child)) check(child.text); else if (ts.isJsxExpression(child)) literal(child.expression); }
      if ((ts.isJsxSelfClosingElement(node) || ts.isJsxOpeningElement(node)) && ["LoadingStatus", "PageLoading", "ActionFeedback", "Feedback", "RefreshButton"].includes(node.tagName.getText(source))) {
        for (const attr of node.attributes.properties) if (ts.isJsxAttribute(attr) && ["label", "description", "pendingLabel"].includes(attr.name.getText(source))) {
          literal(attr.initializer && ts.isJsxExpression(attr.initializer) ? attr.initializer.expression : attr.initializer);
        }
      }
      if (ts.isCallExpression(node) && ["setBusyLabel", "setImportStage"].includes(node.expression.getText(source))) literal(node.arguments[0]);
      ts.forEachChild(node, walk);
    };
    walk(source);
  }
  assert.deepEqual(missing, [], "Missing translations for explicit interface labels");
});
