import { spawn } from 'child_process';
import { writeFile, mkdir, rm } from 'fs/promises';
import { join } from 'path';
import { v4 as uuidv4 } from 'uuid';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const TEMP_DIR = join(__dirname, '../../temp');
const TIMEOUT_MS = 10000;

await mkdir(TEMP_DIR, { recursive: true });

// ─── Type mapping helpers ───

function javaType(type) {
  const map = {
    'int': 'int', 'int[]': 'int[]', 'int[][]': 'int[][]',
    'long': 'long', 'long[]': 'long[]',
    'double': 'double', 'double[]': 'double[]',
    'boolean': 'boolean', 'boolean[]': 'boolean[]',
    'String': 'String', 'String[]': 'String[]',
    'char': 'char', 'char[]': 'char[]',
    'List<Integer>': 'List<Integer>', 'List<String>': 'List<String>',
    'List<List<Integer>>': 'List<List<Integer>>',
  };
  return map[type] || type;
}

function javaParseArg(type, varName) {
  switch (type) {
    case 'int': return `((Number) ${varName}).intValue()`;
    case 'long': return `((Number) ${varName}).longValue()`;
    case 'double': return `((Number) ${varName}).doubleValue()`;
    case 'boolean': return `(Boolean) ${varName}`;
    case 'String': return `(String) ${varName}`;
    case 'char': return `((String) ${varName}).charAt(0)`;
    case 'int[]': return `toIntArray((java.util.List) ${varName})`;
    case 'long[]': return `toLongArray((java.util.List) ${varName})`;
    case 'double[]': return `toDoubleArray((java.util.List) ${varName})`;
    case 'String[]': return `toStringArray((java.util.List) ${varName})`;
    case 'char[]': return `((String) ${varName}).toCharArray()`;
    case 'int[][]': return `toInt2DArray((java.util.List) ${varName})`;
    case 'List<Integer>': return `toIntegerList((java.util.List) ${varName})`;
    case 'List<String>': return `(java.util.List<String>) ${varName}`;
    case 'List<List<Integer>>': return `toListListInteger((java.util.List) ${varName})`;
    default: return `${varName}`;
  }
}

function javaResultToString(type) {
  switch (type) {
    case 'int': case 'long': case 'double': case 'boolean': case 'char':
      return 'String.valueOf(result)';
    case 'String':
      return 'result';
    case 'int[]':
      return 'java.util.Arrays.toString(result)';
    case 'long[]':
      return 'java.util.Arrays.toString(result)';
    case 'double[]':
      return 'java.util.Arrays.toString(result)';
    case 'String[]':
      return 'java.util.Arrays.toString(result)';
    case 'char[]':
      return 'new String(result)';
    case 'int[][]':
      return 'java.util.Arrays.deepToString(result)';
    case 'List<Integer>': case 'List<String>': case 'List<List<Integer>>':
      return 'result.toString()';
    default:
      return 'String.valueOf(result)';
  }
}

// ─── Build Java driver ───

function buildJavaDriver(userCode, functionSig, argsJson) {
  const params = functionSig.params.map(p => `${javaType(p.type)} ${p.name}`).join(', ');
  const argParses = functionSig.params.map((p, i) =>
    `        ${javaType(p.type)} arg${i} = ${javaParseArg(p.type, `argsList.get(${i})`)};`
  ).join('\n');
  const callArgs = functionSig.params.map((_, i) => `arg${i}`).join(', ');
  const resultStr = javaResultToString(functionSig.returnType);

  return `
import java.util.*;

// ─── User Solution ───
${userCode}

// ─── Driver (auto-generated) ───
public class Main {
    public static void main(String[] args) {
        try {
            String jsonInput = new java.util.Scanner(System.in).useDelimiter("\\\\A").next();
            java.util.List<Object> argsList = (java.util.List<Object>) parseJson(jsonInput);

${argParses}

            Solution sol = new Solution();
            ${javaType(functionSig.returnType)} result = sol.${functionSig.name}(${callArgs});
            System.out.println(normalize(${resultStr}));
        } catch (Exception e) {
            System.err.println(e.getMessage());
            e.printStackTrace(System.err);
            System.exit(1);
        }
    }

    static String normalize(String s) {
        return s.replaceAll("\\\\s+", "").replace(",", ", ");
    }

    static Object parseJson(String s) {
        s = s.trim();
        if (s.startsWith("[")) return parseArray(s);
        if (s.startsWith("\\"")) return s.substring(1, s.length() - 1);
        if (s.equals("true")) return Boolean.TRUE;
        if (s.equals("false")) return Boolean.FALSE;
        if (s.contains(".")) return Double.parseDouble(s);
        try { return Long.parseLong(s); } catch (Exception e) { return s; }
    }

    static java.util.List<Object> parseArray(String s) {
        s = s.trim();
        s = s.substring(1, s.length() - 1).trim();
        if (s.isEmpty()) return new java.util.ArrayList<>();
        java.util.List<Object> list = new java.util.ArrayList<>();
        int depth = 0; int start = 0;
        for (int i = 0; i < s.length(); i++) {
            char c = s.charAt(i);
            if (c == '[') depth++;
            else if (c == ']') depth--;
            else if (c == ',' && depth == 0) {
                list.add(parseJson(s.substring(start, i).trim()));
                start = i + 1;
            }
        }
        list.add(parseJson(s.substring(start).trim()));
        return list;
    }

    static int[] toIntArray(java.util.List list) {
        int[] a = new int[list.size()];
        for (int i = 0; i < list.size(); i++) a[i] = ((Number) list.get(i)).intValue();
        return a;
    }
    static long[] toLongArray(java.util.List list) {
        long[] a = new long[list.size()];
        for (int i = 0; i < list.size(); i++) a[i] = ((Number) list.get(i)).longValue();
        return a;
    }
    static double[] toDoubleArray(java.util.List list) {
        double[] a = new double[list.size()];
        for (int i = 0; i < list.size(); i++) a[i] = ((Number) list.get(i)).doubleValue();
        return a;
    }
    static String[] toStringArray(java.util.List list) {
        String[] a = new String[list.size()];
        for (int i = 0; i < list.size(); i++) a[i] = (String) list.get(i);
        return a;
    }
    static int[][] toInt2DArray(java.util.List list) {
        int[][] a = new int[list.size()][];
        for (int i = 0; i < list.size(); i++) a[i] = toIntArray((java.util.List) list.get(i));
        return a;
    }
    static java.util.List<Integer> toIntegerList(java.util.List list) {
        java.util.List<Integer> r = new java.util.ArrayList<>();
        for (Object o : list) r.add(((Number) o).intValue());
        return r;
    }
    static java.util.List<java.util.List<Integer>> toListListInteger(java.util.List list) {
        java.util.List<java.util.List<Integer>> r = new java.util.ArrayList<>();
        for (Object o : list) r.add(toIntegerList((java.util.List) o));
        return r;
    }
}
`;
}

// ─── Build JavaScript driver ───

function buildJSDriver(userCode, functionSig, argsJson) {
  const params = functionSig.params.map(p => p.name).join(', ');
  const callArgs = functionSig.params.map((_, i) => `args[${i}]`).join(', ');

  return `
// ─── User Solution ───
${userCode}

// ─── Driver (auto-generated) ───
(function() {
  const args = ${argsJson};
  const result = ${functionSig.name}(${callArgs});
  const output = typeof result === 'object' ? JSON.stringify(result) : String(result);
  console.log(output.replace(/,/g, ', '));
})();
`;
}

// ─── Normalize output for comparison ───

function normalizeOutput(s) {
  return (s || '').trim().replace(/\s+/g, '').replace(/,/g, ', ');
}

// ─── Execute Java ───

async function executeJava(fullCode, input) {
  const sessionId = uuidv4();
  const sessionDir = join(TEMP_DIR, sessionId);
  await mkdir(sessionDir, { recursive: true });
  const javaFile = join(sessionDir, 'Main.java');

  try {
    await writeFile(javaFile, fullCode, 'utf-8');

    const compileResult = await runProcess('javac', [javaFile], sessionDir, TIMEOUT_MS);
    if (compileResult.exitCode !== 0) {
      let err = (compileResult.stderr || compileResult.stdout || '');
      // Strip file paths for cleaner errors, keep just the user-relevant part
      err = err.replace(/.*Main\.java:\d+: /g, 'Line: ');
      return { success: false, error: `Compilation Error:\n${err}`, executionTime: 0 };
    }

    const startTime = performance.now();
    const runResult = await runProcess('java', ['-cp', sessionDir, 'Main'], sessionDir, TIMEOUT_MS, input);
    const executionTime = Math.round(performance.now() - startTime);

    if (runResult.timedOut) return { success: false, error: 'Time Limit Exceeded (10s)', executionTime: TIMEOUT_MS };
    if (runResult.exitCode !== 0) return { success: false, error: `Runtime Error:\n${runResult.stderr}`, executionTime };

    return { success: true, output: runResult.stdout.trim(), executionTime };
  } finally {
    try { await rm(sessionDir, { recursive: true, force: true }); } catch (e) {}
  }
}

// ─── Execute JavaScript ───

async function executeJavaScript(fullCode) {
  const startTime = performance.now();
  try {
    const wrappedCode = `
      const __outputs = [];
      const __origLog = console.log;
      console.log = (...args) => __outputs.push(args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' '));
      ${fullCode}
      __outputs.join('\\n');
    `;
    const AsyncFunction = Object.getPrototypeOf(async function(){}).constructor;
    const result = await Promise.race([
      new AsyncFunction(wrappedCode)(),
      new Promise((_, reject) => setTimeout(() => reject(new Error('TLE')), TIMEOUT_MS))
    ]);
    const executionTime = Math.round(performance.now() - startTime);
    return { success: true, output: (result || '').trim(), executionTime };
  } catch (err) {
    const executionTime = Math.round(performance.now() - startTime);
    if (err.message === 'TLE') return { success: false, error: 'Time Limit Exceeded (10s)', executionTime: TIMEOUT_MS };
    return { success: false, error: `Runtime Error:\n${err.message}`, executionTime };
  }
}

// ─── Process spawner ───

function runProcess(command, args, cwd, timeout, stdin = null) {
  return new Promise((resolve) => {
    const proc = spawn(command, args, { cwd, shell: true });
    let stdout = '', stderr = '', timedOut = false;
    const timer = setTimeout(() => { timedOut = true; proc.kill('SIGTERM'); setTimeout(() => proc.kill('SIGKILL'), 1000); }, timeout);
    proc.stdout.on('data', d => stdout += d);
    proc.stderr.on('data', d => stderr += d);
    if (stdin) { proc.stdin.write(stdin); proc.stdin.end(); } else { proc.stdin.end(); }
    proc.on('close', exitCode => { clearTimeout(timer); resolve({ stdout, stderr, exitCode, timedOut }); });
    proc.on('error', err => { clearTimeout(timer); resolve({ stdout: '', stderr: err.message, exitCode: 1, timedOut: false }); });
  });
}

// ─── Public API ───

export async function runCode(code, language, testCases, functionSignature, customInput = null) {
  // Custom input mode — just run the code as-is
  if (customInput !== null && customInput !== undefined) {
    if (language === 'java') {
      const result = await executeJava(code, customInput);
      return { customResult: result, results: [] };
    } else {
      const result = await executeJavaScript(code);
      return { customResult: result, results: [] };
    }
  }

  if (!functionSignature) {
    throw new Error('Function signature is required for test case execution');
  }

  const results = [];
  for (const tc of testCases) {
    const argsJson = JSON.stringify(tc.args);
    let result;

    if (language === 'java') {
      const fullCode = buildJavaDriver(code, functionSignature, argsJson);
      result = await executeJava(fullCode, argsJson);
    } else {
      const fullCode = buildJSDriver(code, functionSignature, argsJson);
      result = await executeJavaScript(fullCode);
    }

    const expected = normalizeOutput(typeof tc.expected === 'object' ? JSON.stringify(tc.expected) : String(tc.expected));
    const actual = result.success ? normalizeOutput(result.output) : '';

    results.push({
      input: tc.args.map(a => JSON.stringify(a)).join(', '),
      expected,
      actual,
      passed: result.success && actual === expected,
      executionTime: result.executionTime,
      error: result.error || null,
    });
  }

  return { results };
}
