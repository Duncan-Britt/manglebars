'use strict';

const Manglebars = {
  registerHelper(name, func) {
    this.special_forms[name] = func;
  },

  special_forms: {
    each: function(array, template) {
      let html = '';
      let templates_data = array[0];

      templates_data.forEach(template_data => {
        html += Manglebars.compile(template)(template_data);
      });

      return html;
    },

    if: function(args, template) {
      let html = '';

      let bool = args[0];
      if (bool) {
        html = Manglebars.compile(template)(template_data);
      }

      return html;
    },
  },

  compile(template_text) {
    const tokens = this.parse(template_text);

    const tree = [];
    tokens.forEach(token => this.parse_apply(token, tree));

    return function evaluate_tree(template_data) {
      let html = '';

      tree.forEach(branch => {
        switch (branch.type) {
          case 'text':
            html += branch.value;
            break;
          case 'binding':
            html += template_data[branch.value]
            break;
          case 'operator':
            let args = branch.bindings.map(binding => {
              return template_data[binding];
            });

            html += Manglebars.special_forms[branch.name](args, branch.template)

            break;
          default:
            throw `Invalid token: ${branch}`
        }
      });

      return html;
    };
  },

  parse_apply(token, tree) {
    if (/\{\{/.test(token)) {
      if (/\{\{\#/.test(token)) { // operator
        let expression = { type: "operator"};
        [ expression.name, expression.bindings, expression.template ] = this.parse_chunk_operator(token);
        tree.push(expression);
      } else { // binding
        tree.push({
          type: "binding",
          value: token.replace(/[{}]/g, ''),
        });
      }
    } else { // text
      tree.push({
        type: "text",
        value: token,
      });
    }
  },

  parse_chunk_operator(operator_chunk) {
    const result = [];

    let operator = '';
    for (var i = 3; i < operator_chunk.length; ++i) {
      if (operator_chunk[i] === ' ') break;

      operator += operator_chunk[i];
    }
    i++;

    let args;
    [operator_chunk, args] = this.parse_chunk_operator_arguments(operator_chunk.slice(i));
    const operator_template = this.parse_chunk_operator_template(operator_chunk, operator);

    return [ operator, args, operator_template ];
  },

  parse_chunk_operator_template(chunk, operator) {
    let template = '';
    for (let i = 0; i < chunk.length; ++i) {
      if (chunk.slice(i, i+4) === "{{\/\/" && chunk.slice(i+4, i + 4 + operator.length) === operator) {
        return template
      }

      template += chunk[i];
    }

    throw `Invalid Manglebars expression. Expecting: {{/${operator}}}`;
  },

  parse_chunk_operator_arguments(chunk) {
    let args = [];
    let token = '';
    for (var i = 0; i < chunk.length; ++i) {
      if (chunk[i] === ' ') {
        args.push(token);
        token = '';
      } else if (chunk[i] === '}' && chunk[i+1] === '}') {
        args.push(token);
        return [ chunk.slice(i+2), args]
      }

      token += chunk[i];
    }

    throw 'Invalid Manglebars expression. Expecting: }}';
  },

  parse(template_text) {
    let token;
    const tokens = [];

    while (template_text != '') {
      [ template_text, token ] = this.parse_token(template_text);
      tokens.push(token);
    }

    return tokens;
  },

  parse_token(template_text) {
    let token = template_text[0];

    switch (token) {
      case '{':
        if (template_text[1] === '{') {
          if (template_text[2] === '#') {
            return this.parse_token_operator(token, template_text);
          } else {
            return this.parse_token_binding(token, template_text);
          }
        } else {
          return this.parse_token_markup(token, template_text);
        }
        break;
      default:
        return this.parse_token_markup(token, template_text);
    }
  },

  parse_token_operator(token, template_text) {
    token += template_text[1];
    token += template_text[2];

    for (var i = 3; i < template_text.length; ++i) {
      if (template_text[i] === '{' && template_text[i+1] === '{' && template_text[i+2] === '/') {
        token += template_text.slice(i, i+3);

        for (i = i + 2; i < template_text.length; ++i) {
          if (template_text[i] === '}' && template_text[i+1] === '}') {
            token += template_text[i];
            token += template_text[i+1];
            return [template_text.slice(i + 2), token];
          }

          token += template_text[i];
        }

        throw 'Invalid Manglebars expression. Expecting: }}';
      }

      token += template_text[i];
    }

    throw 'Invalid Manglebars expression. Expecting: {{/';
  },

  parse_token_binding(token, template_text) {
    token += template_text[1];

    for (var i = 2; i < template_text.length; ++i) {
      if (template_text[i] === '}') {
        if (template_text[i + 1] === '}') {
          token += template_text[i];
          token += template_text[i+1];
          return [template_text.slice(i + 2), token];
        }
      }

      token += template_text[i];
    }

    throw 'Invalid Manglebars expression. Expecting: }}';
  },

  parse_token_markup(token, template_text) {
    for (var i = 1; i < template_text.length; ++i) {
      if (template_text[i] === '{') {
        if (template_text[i + 1] === '{') {
          return [template_text.slice(i), token];
        }
      }

      token += template_text[i];
    }

    return [template_text.slice(i), token];
  },
};
