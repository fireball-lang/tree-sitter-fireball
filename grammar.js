/**
 * @file General-purpose programming language that compiles to efficient native binaries.
 * @author MineGame159 <petulko08@gmail.com>
 * @license MIT
 */

/// <reference types="tree-sitter-cli/dsl" />
// @ts-check

/**
 * @param field_name {string}
 * @param rule {RuleOrLiteral}
 * @returns {ChoiceRule}
 */
function comma_list(field_name, rule) {
  return optional(seq(
    field(field_name, rule),
    repeat(seq(",", field(field_name, rule))),
    optional(","),
  ))
}

const binary_integer = /0[bB][01]+/
const hex_integer = /0[xX][0-9a-fA-F]+/

const unsigned_integer = /[0-9]+[uU]/
const signed_integer = /[0-9]+/

const double = /[0-9]+\.[0-9]+/
const float = /[0-9]+\.[0-9]+[fF]/

const char = /'(?:[^'\\]|\\[^xX]|\\[xX][0-9a-fA-F]{2})'/
const string = /"([^"\\]|\\.)*"/

module.exports = grammar({
  name: "fireball",

  word: $ => $.identifier,

  extras: $ => [
    /\s/,
    $.comment,
  ],

  supertypes: $ => [
    $.decl,
    $.stmt,
    $.expr,
    $.type,
  ],

  rules: {
    source_file: $ => repeat($.decl),

    // Declarations

    decl: $ => choice(
      $.mod,
      $.import,
      $.struct,
      $.func,
    ),

    attribute: $ => seq(
      field("name", $.identifier),
      optional(seq(
        "(",
        comma_list("arg", $.expr),
        ")",
      )),
    ),

    attribute_group: $ => seq(
      "#",
      "[",
      comma_list("attr", $.attribute),
      "]",
    ),

    mod: $ => seq(
      "mod",
      field("path", $.identifier_path),
      ";",
    ),

    import: $ => seq(
      "import",
      field("path", $.identifier),
      repeat(seq(
        "::",
        choice(
          field("path", $.identifier),
          seq(
            "{",
            comma_list("symbol", choice(
              "*",
              $.identifier,
            )),
            "}",
          ),
        ),
      )),
      optional(seq(
        "as",
        field("name", $.identifier),
      )),
      ";",
    ),

    struct: $ => seq(
      field("attr_group", repeat($.attribute_group)),
      "struct",
      field("name", $.identifier),
      "{",
      comma_list("field", $.name_type),
      "}",
    ),

    func: $ => seq(
      field("attr_group", repeat($.attribute_group)),
      "func",
      field("name", $.identifier),
      "(",
      comma_list("param", choice($.name_type, "...")),
      ")",
      field("returns", optional($.type)),
      field("body", optional($.block)),
    ),

    // Statements

    stmt: $ => choice(
      $.block,
      $.expression,
      $.var,
      $.if,
      $.while,
      $.for,
      $.return,
      $.break,
      $.continue,
    ),

    block: $ => seq(
      "{",
      field("stmt", repeat($.stmt)),
      "}",
    ),

    expression: $ => seq(
      field("expr", $.expr),
      ";",
    ),

    var: $ => seq(
      "var",
      field("name", $.identifier),
      optional(seq(
        ":",
        field("type", $.type),
      )),
      optional(seq(
        "=",
        field("initializer", $.expr),
      )),
      ";",
    ),

    if: $ => prec.right(seq(
      "if",
      "(",
      field("condition", $.expr),
      ")",
      field("if_true", $.stmt),
      optional(seq(
        "else",
        field("if_false", $.stmt),
      )),
    )),

    while: $ => seq(
      "while",
      "(",
      field("condition", $.expr),
      ")",
      field("body", $.stmt),
    ),

    for: $ => seq(
      "for",
      "(",
      choice(field("initializer", $.stmt), ";"), // initializer
      optional(field("condition", $.expr)), ";", // condition
      optional(field("increment", $.expr)),      // increment
      ")",
      field("body", $.stmt),
    ),

    return: $ => seq(
      "return",
      optional(field("value", $.expr)),
      ";",
    ),

    break: $ => seq(
      "break",
      ";",
    ),

    continue: $ => seq(
      "continue",
      ";",
    ),

    // Expressions

    expr: $ => choice(
      $.paren_expr,

      $.bool,
      $.number,
      $.char,
      $.string,

      $.prefix_expr,
      $.binary_expr,

      $.identifier_path,
      $.index_expr,
      $.member_expr,
      $.call_expr,
    ),

    paren_expr: $ => seq(
      "(",
      field("expr", $.expr),
      ")",
    ),

    bool: $ => choice("true", "false"),

    number: $ => choice(binary_integer, hex_integer, unsigned_integer, signed_integer, float, double),

    char: $ => char,

    string: $ => string,

    prefix_expr: $ => prec(11, seq(
      choice("-", "!"),
      field("expr", $.expr),
    )),

    binary_expr: $ => choice(
      prec.right(1, seq(field("left", $.expr), "=", field("right", $.expr))),
      prec.left(2, seq(field("left", $.expr), "||", field("right", $.expr))),
      prec.left(3, seq(field("left", $.expr), "&&", field("right", $.expr))),
      prec.left(4, seq(field("left", $.expr), "|", field("right", $.expr))),
      prec.left(5, seq(field("left", $.expr), "^", field("right", $.expr))),
      prec.left(6, seq(field("left", $.expr), "&", field("right", $.expr))),
      prec.left(7, seq(field("left", $.expr), choice("==", "!="), field("right", $.expr))),
      prec.left(8, seq(field("left", $.expr), choice("<", "<=", ">", ">="), field("right", $.expr))),
      prec.left(9, seq(field("left", $.expr), choice("+", "-"), field("right", $.expr))),
      prec.left(10, seq(field("left", $.expr), choice("*", "/", "%"), field("right", $.expr))),
    ),

    index_expr: $ => prec(12, seq(
      field("expr", $.expr),
      "[",
      field("index", $.expr),
      "]",
    )),

    member_expr: $ => prec(12, seq(
      field("expr", $.expr),
      ".",
      field("name", $.identifier),
    )),

    call_expr: $ => prec(12, seq(
      field("callee", $.expr),
      "(",
      comma_list("arg", $.expr),
      ")",
    )),

    // Types

    type: $ => choice(
      $.primitive_type,
      $.array_type,
      $.pointer_type,
      $.identifier_type,
    ),

    primitive_type: $ => choice(
      "void",
      "bool",

      "u8",
      "u16",
      "u32",
      "u64",

      "i8",
      "i16",
      "i32",
      "i64",

      "f32",
      "f64",
    ),

    array_type: $ => seq(
      "[",
      field("size", $.integer),
      "]",
      field("element", $.type),
    ),

    pointer_type: $ => seq(
      "*",
      field("pointee", $.type),
    ),

    identifier_type: $ => $.identifier_path,

    // Other

    name_type: $ => seq(
      field("name", $.identifier),
      ":",
      field("type", $.type),
    ),

    integer: $ => choice(binary_integer, hex_integer, unsigned_integer, signed_integer),

    identifier: $ => /[a-zA-Z_][a-zA-Z_0-9]*/,

    identifier_path: $ => seq(
      $.identifier,
      repeat(seq(
        "::",
        $.identifier,
      )),
    ),

    comment: $ => token(choice(
      seq("//", /.*/),
      seq("/*", /[^*]*\*+([^/*][^*]*\*+)*/, "/"),
    )),
  }
});
