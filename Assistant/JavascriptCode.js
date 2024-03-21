const babel = require("@babel/core");

function readExportsStmt({ types: t }) {
  return {
    visitor: {
      AssignmentExpression(path) {
        if (t.isMemberExpression(path.node.left) &&
            path.node.left.object.name === 'module' &&
            path.node.left.property.name === 'exports') {
          console.log('Found module.exports:', path.toString());
        }
      }
    }
  }
}


const addReturnIfMissingPlugin = ({ types: t }) => ({
  visitor: {
    Program(path) {
      let hasReturn = false;
      path.get('body').forEach((nodePath) => {
        console.log("node", nodePath)
        if (t.isReturnStatement(nodePath)) {
          hasReturn = true;
        }
      });
      if (!hasReturn) {
        // Add a return statement at the end if there's none
        const lastNode = path.get('body')[path.node.body.length - 1];
        if (t.isExpressionStatement(lastNode)) {
          lastNode.replaceWith(
            t.returnStatement(lastNode.node.expression)
          );
        }
      }
    }
  }
});


const returnFunctionDeclPlugin = ({ types: t }) => {
  return {
    visitor: {
      Program(path) {
        const body = path.get('body');
        const lastStatement = body[body.length - 1];

        // Check if the last statement is a function declaration
        if (t.isFunctionDeclaration(lastStatement.node)) {
          console.log("Found function declaration");

          // Transform the function declaration into a function expression
          const funcExpr = t.functionExpression(
            lastStatement.node.id,
            lastStatement.node.params,
            lastStatement.node.body,
            lastStatement.node.generator,
            lastStatement.node.async
          );

          // Directly replace the function declaration with the function expression
          lastStatement.replaceWith(funcExpr);
        }
      },
    },
  };
};

const returnFunctionDecl = code => {
  try {
    console.log('transpiling', code)
    const { code: transpiledCode } = babel.transform(code, {
      sourceType: 'unambiguous',
      plugins: [returnFunctionDeclPlugin],
      presets: [
        ["@babel/preset-env", {
          "targets": {
            "node": "8"  // or a higher version that supports async/await
          }
        }]
      ]
    });
    console.log('transpiled', transpiledCode)
    // Safely evaluate the transpiled code
    return transpiledCode
  } catch (error) {
    console.error(error)
    if (error.message.indexOf("'return' outside of function" >= 0)) {
      return code
    }
    throw error
  }
}


// Function to transpile and evaluate code
const addReturnStatementIfNecessary = code => {
  try {
    console.log('transpiling', code)
    const { code: transpiledCode } = babel.transform(code, {
      sourceType: 'unambiguous',
      plugins: [addReturnIfMissingPlugin],
      presets: [
        ["@babel/preset-env", {
          "targets": {
            "node": "8"  // or a higher version that supports async/await
          }
        }]
      ]
    });
    console.log('transpiled', transpiledCode)
    // Safely evaluate the transpiled code
    return transpiledCode
  } catch (error) {
    if (error.message.indexOf("'return' outside of function" >= 0)) {
      return code
    }
    console.error(error)
    throw error
  }
}


module.exports = { addReturnStatementIfNecessary, returnFunctionDecl }
