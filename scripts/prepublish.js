const fs = require('fs')
const path = require('path')
const pkg = require('../package.json')

const newPkgJSON = {
  name: 'xstate-tools',
  main: './index.js',
  types: './index.d.ts',
  bin: {
    viz: './visualize.js',
  },
}

const fieldsToCopy = ['version', 'author', 'dependencies', 'engines']
fieldsToCopy.forEach(key => {
  newPkgJSON[key] = pkg[key]
})

fs.writeFileSync(path.resolve(__dirname, '..', 'lib', 'package.json'), JSON.stringify(newPkgJSON, null, 2))
