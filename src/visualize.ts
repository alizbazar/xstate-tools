#!/usr/bin/env node
const rollup = require('rollup')
const includePaths = require('rollup-plugin-includepaths')
const path = require('path')
const typescript = require('rollup-plugin-typescript')
const fs = require('fs')

const getFileInfo = () => {
  const fileArg = path.resolve(process.cwd(), process.argv[2])
  const parts = fileArg.match(/^(.+?)\.(?:viz\.)?([tj]s)$/)!
  parts.shift()
  const [filename, extension] = parts

  let visualization = `${filename}.viz.${extension}`
  const machine = `${filename}.${extension}`

  try {
    fs.accessSync(visualization, fs.constants.R_OK)
  } catch (err) {
    visualization = machine
  }

  return {
    visualization,
    machine,
    extension,
  }
}

const { visualization, extension } = getFileInfo()

function pbcopy(data: string) {
  const proc = require('child_process').spawn('pbcopy')
  proc.stdin.write(data)
  proc.stdin.end()
}

const includePathOptions = {
  include: {},
  paths: ['.'],
  external: [],
  extensions: ['.js'],
}

if (extension === 'ts') {
  includePathOptions.extensions.push('.ts')
}

const plugins = [includePaths(includePathOptions)]
if (extension === 'ts') {
  plugins.unshift(typescript())
}

const config = {
  input: path.resolve(visualization),
  external: ['xstate'],
  plugins,
}

const outputConfig = {
  format: 'iife',
  exports: 'named',
  name: 'moduleExports',
  globals: {
    xstate: 'XState',
  },
}

async function build() {
  const bundle = await rollup.rollup(config)
  const { output } = await bundle.generate(outputConfig)
  return output[0].code
}

const replaceLast = (subject: string, searchFor: string, replaceWith: string) => {
  const pieces = subject.split(searchFor)
  const end = pieces.pop()
  return `${pieces.join(searchFor)}${replaceWith}${end}`
}

const getCode = () =>
  build().then(output => {
    // Interpreter provides synthetic Machine function and intercepts machine created
    // Thus Machine cannot be imported directly from XState
    const code = replaceLast(output, 'xstate.Machine(', 'Machine(')

    pbcopy(code)
    process.stdout.write('\nOpen https://xstate.js.org/viz/ and paste code into window 👌\n\n')
  })

getCode()
