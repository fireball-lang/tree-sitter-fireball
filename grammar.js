
/// <reference types="tree-sitter-cli/dsl" />
// @ts-check

/**
 * @param {string} field_name
 * @param {RuleOrLiteral} rule
 * @returns {RuleOrLiteral}
 */
function comma_list(field_name, rule) {
  const item = field_name !== "" ? field(field_name, rule) : rule;

  return optional(seq(
    item,
    repeat(seq(
      ",",
      item,
    )),
    optional(","),
  ))
}

/**
 * @param {RuleOrLiteral} identifier
 * @returns {RuleOrLiteral}
 */
function path(identifier) {
    return seq(
      identifier,
      repeat(seq(
        "::",
        identifier,
      )),
    )
}

/**
 * @param {RuleOrLiteral} identifier
 * @param {RuleOrLiteral} type
 * @param {any} typeParamsRequireTurbofish
 * @returns {RuleOrLiteral}
 */
function identifier_path(identifier, type, typeParamsRequireTurbofish) {
  return path(seq(
    identifier,
    optional(seq(
      typeParamsRequireTurbofish ? seq(":", "[") : "[",
      comma_list("type_arg", type),
      "]",
    )),
  ))
}

const binary_integer = /0[bB][01_]+/
const hex_integer = /0[xX][0-9a-fA-F_]+/

const unsigned_integer = /[0-9_]+[uU]/
const signed_integer = /[0-9_]+/

const double = /[0-9_]+\.[0-9_]+/
const float = /[0-9_]+\.[0-9_]+[fF]/

const char = /'(?:[^'\\]|\\[^xX]|\\[xX][0-9a-fA-F]{2})'/
const string = /"([^"\\]|\\.)*"/

module.exports = grammar({
  name: "fireball",

  word: $ => $.identifier,

  extras: $ => [
    /\s/,
    $.comment,
  ],

  conflicts: $ => [
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
      $.enum,
      $.interface,
      $.impl,
      $.global_var,
      $.func,
    ),

    mod: $ => seq(
      field("attr_group", repeat($.attribute_group)),
      "mod",
      field("path", path($.identifier)),
      ";",
    ),

    import: $ => seq(
      field("attr_group", repeat($.attribute_group)),
      "import",
      field("path", path($.identifier)),
      optional(seq(
        "::",
        "{",
        comma_list("symbol", $.identifier),
        "}",
      )),
      optional(seq(
        "as",
        field("name", $.identifier),
      )),
      ";",
    ),

    struct: $ => seq(
      field("attr_group", repeat($.attribute_group)),
      optional("pub"),
      "struct",
      field("name", $.identifier),
      optional(seq(
        "[",
        comma_list("type_param", $.type_param),
        "]",
      )),
      "{",
      comma_list("field", $.field),
      "}",
    ),

    field: $ => seq(
      optional("pub"),
      field("name", $.identifier),
      ":",
      field("type", $.type),
    ),

    enum: $ => seq(
      field("attr_group", repeat($.attribute_group)),
      optional("pub"),
      "enum",
      field("name", $.identifier),
      optional(seq(
        ":",
        field("type", $.type),
      )),
      "{",
      comma_list("case", $.case),
      "}",
    ),

    case: $ => seq(
      field("name", $.identifier),
      optional(seq(
        "=",
        field("value", $.integer),
      )),
    ),

    interface: $ => seq(
      field("attr_group", repeat($.attribute_group)),
      optional("pub"),
      "interface",
      field("name", $.identifier),
      optional(seq(
        "[",
        comma_list("type_param", $.type_param),
        "]",
      )),
      "{",
      repeat(choice(
        field("assoc_type", $.associated_type),
        field("func", $.func),
      )),
      "}",
    ),

    impl: $ => seq(
      field("attr_group", repeat($.attribute_group)),
      "impl",
      optional(seq(
        "[",
        comma_list("type_param", $.type_param),
        "]",
      )),
      field("type", $.type),
      optional(seq(
        ":",
        field("interface", $.identifier_type),
      )),
      "{",
      repeat(choice(
        field("assoc_type", $.associated_type),
        field("func", $.func),
      )),
      "}",
    ),

    associated_type: $ => seq(
      "type",
      field("name", $.identifier),
      optional(seq(
        "=",
        field("type", $.type),
      )),
      ";",
    ),

    global_var: $ => seq(
      field("attr_group", repeat($.attribute_group)),
      optional("pub"),
      "var",
      field("name", $.identifier),
      ":",
      field("type", $.type),
      ";",
    ),

    func: $ => seq(
      field("attr_group", repeat($.attribute_group)),
      optional("pub"),
      "func",
      field("name", $.identifier),
      optional(seq(
        "[",
        comma_list("type_param", $.type_param),
        "]",
      )),
      "(",
      choice(
        comma_list("param", choice($.param, "...")),
        seq(
          field("receiver", seq(
            optional("mut"),
            $.identifier,
          )),
          optional(seq(
            ",",
            comma_list("param", choice($.param, "...")),
          )),
        ),
      ),
      ")",
      field("returns", optional($.type)),
      choice(
        field("body", $.block),
        ";",
      ),
    ),

    param: $ => seq(
      optional(seq(
        field("name", $.identifier),
        ":",
      )),
      field("type", $.type),
    ),

    type_param: $ => seq(
      field("name", $.identifier),
      optional(seq(
        ":",
        field("constraint", $.type),
        repeat(seq(
          "+",
          field("constraint", $.type),
        )),
      )),
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
      $.null_expr,

      $.struct_initializer,
      $.array_initializer,

      $.sizeof,
      $.alignof,
      $.offsetof,

      $.prefix_expr,
      $.postfix_expr,
      $.binary_expr,

      $.identifier_expr,
      $.index_expr,
      $.member_expr,
      $.call_expr,
      $.cast_expr
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
    null_expr: $ => "null",

    struct_initializer: $ => seq(
      field("type", identifier_path($.identifier, $.type, true)),
      "{",
      comma_list("field", $.field_initializer),
      "}",
    ),

    field_initializer: $ => seq(
      field("name", $.identifier),
      ":",
      field("value", $.expr),
    ),

    array_initializer: $ => seq(
      field("type", $.array_type),
      "{",
      comma_list("element", $.expr),
      "}",
    ),

    sizeof: $ => seq(
      "sizeof",
      "(",
      field("type", $.type),
      ")",
    ),

    alignof: $ => seq(
      "alignof",
      "(",
      field("type", $.type),
      ")",
    ),

    offsetof: $ => seq(
      "offsetof",
      "(",
      field("type", $.type),
      ",",
      field("field", $.identifier),
      ")",
    ),

    prefix_expr: $ => prec(13, seq(
      choice("-", "!", "++", "--", "&", "*"),
      field("expr", $.expr),
    )),

    postfix_expr: $ => prec(14, seq(
      field("expr", $.expr),
      choice("++", "--", "?"),
    )),

    binary_expr: $ => choice(
      prec.right(1, seq(field("left", $.expr), choice("=", "+=", "-=", "*=", "/=", "%=", "<<=", ">>=", ">>>=", "|=", "^=", "&="), field("right", $.expr))),
      prec.left(2, seq(field("left", $.expr), "||", field("right", $.expr))),
      prec.left(3, seq(field("left", $.expr), "&&", field("right", $.expr))),
      prec.left(4, seq(field("left", $.expr), "|", field("right", $.expr))),
      prec.left(5, seq(field("left", $.expr), "^", field("right", $.expr))),
      prec.left(6, seq(field("left", $.expr), "&", field("right", $.expr))),
      prec.left(7, seq(field("left", $.expr), choice("==", "!="), field("right", $.expr))),
      prec.left(8, seq(field("left", $.expr), choice("<", "<=", ">", ">="), field("right", $.expr))),
      prec.left(9, seq(field("left", $.expr), "or", field("right", $.expr))),
      prec.left(10, seq(field("left", $.expr), choice("<<", ">>", ">>>"), field("right", $.expr))),
      prec.left(11, seq(field("left", $.expr), choice("+", "-"), field("right", $.expr))),
      prec.left(12, seq(field("left", $.expr), choice("*", "/", "%"), field("right", $.expr))),
    ),

    identifier_expr: $ => prec(15, identifier_path($.identifier, $.type, true)),

    index_expr: $ => prec(15, seq(
      field("expr", $.expr),
      "[",
      field("index", $.expr),
      "]",
    )),

    member_expr: $ => prec(15, seq(
      field("expr", $.expr),
      ".",
      field("name", $.identifier),
    )),

    call_expr: $ => prec(15, seq(
      field("callee", $.expr),
      "(",
      comma_list("arg", $.expr),
      ")",
    )),

    cast_expr: $ => prec(9, seq(
      field("expr", $.expr),
      "as",
      field("type", $.type),
    )),

    // Types

    type: $ => choice(
      $.primitive_type,
      $.array_type,
      $.pointer_type,
      $.func_type,
      $.identifier_type,
      $.option_type,
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
      field("size", $.number),
      "]",
      field("element", $.type),
    ),

    pointer_type: $ => prec.left(0, seq(
      field("mut", optional("mut")),
      "*",
      field("pointee", $.type),
    )),

    func_type: $ => seq(
      "func",
      "(",
      comma_list("param", choice($.param, "...")),
      ")",
      field("returns", $.type),
    ),

    identifier_type: $ => prec.left(seq(
      field("mut", optional("mut")),
      field("path", identifier_path($.identifier, $.type, false)),
    )),

    option_type: $ => seq(
      "?",
      field("type", $.type),
    ),

    // Attributes

    attribute_group: $ => seq(
      "#",
      "[",
      comma_list("attr", $.attribute),
      "]",
    ),

    attribute: $ => choice(
      $.init_attribute,
      $.test_attribute,
      $.extern_attribute,
      $.link_name_attribute,
      $.repr_attribute,
      $.cfg_attribute,
    ),

    init_attribute: $ => "init",

    test_attribute: $ => seq(
      "test",
      optional(seq(
        "(",
        field("name", $.string),
        ")",
      )),
    ),

    extern_attribute: $ => "extern",

    link_name_attribute: $ => seq(
      "link_name",
      "(",
      field("name", $.string),
      ")",
    ),

    repr_attribute: $ => seq(
      "repr",
      "(",
      field("layout", choice(
        "Fireball",
        "C",
      )),
      ")",
    ),

    cfg_attribute: $ => seq(
      "cfg",
      "(",
      field("predicate", $.cfg_predicate),
      ")",
    ),

    // Cfg Predicates

    cfg_predicate: $ => choice(
      $.option_cfg,
      $.call_cfg,
    ),

    option_cfg: $ => seq(
      field("name", $.identifier),
      choice(
        "=",
        "!=",
      ),
      field("value", $.string),
    ),

    call_cfg: $ => seq(
      field("name", $.identifier),
      "(",
      comma_list("predicate", $.cfg_predicate),
      ")",
    ),

    // Other

    integer: $ => choice(binary_integer, hex_integer, unsigned_integer, signed_integer),

    identifier: $ => /[a-zA-Z_][a-zA-Z_0-9]*/,

    comment: $ => token(choice(
      seq("//", /.*/),
      seq("/*", /[^*]*\*+([^/*][^*]*\*+)*/, "/"),
    )),
  }
});
