const {
  Command,
  flags,
} = require('@oclif/command')

const {
  readFileSync,
} = require('fs')

const cli = require('cli-ux').cli

const request = require('request-promise')

class OpScannerCommand extends Command {
  async run() {
    const {
      flags,
    } = this.parse(OpScannerCommand)

    let contractListContent = readFileSync(flags.contractList, {
      encoding: 'utf-8',
    })
    let contractList = contractListContent.split('\n')

    for (const contractIndex of Object.keys(contractList)) {
      let contract = contractList[parseInt(contractIndex, 10)]

      cli.action.start(`Scanning ${contract}`)
      try {
        const found = await this.scanContract(contract, flags.func, flags.operation)
        if (found) {
          cli.action.stop('FOUND!')
        } else {
          cli.action.stop('done')
        }
      } catch (error) {
        cli.action.stop('error')
      }
      // return
    }
  }

  async scanContract(contract, func, operation) {
    let disas = await request.get(`https://eveem.org/code/${contract}.json`)
    .then(body => {
      return JSON.parse(body)
    })
    .catch(error => {
      this.error(`${error.toString()}`)
      return false
    })

    return this.findOperation(disas, func, operation)
  }

  async findOperation(disas, func, operation) {
    for (let f in disas.functions) {
      if (disas.functions[f].name.startsWith(func)) {
        return this.findInTrace(disas.functions[f].trace, operation)
      }
    }
    return false
  }

  async findInTrace(trace, operation) {
    for (let t in trace) {
      if (await this.recursiveFindInTrace(trace[t], operation) === true) {
        return true
      }
    }

    return false
  }

  async recursiveFindInTrace(trace, operation) {
    for (let t in trace) {
      if (typeof trace[t] === 'string' || trace[t] instanceof String) {
        if (trace[t].toLowerCase() === operation.toLowerCase()) {
          return true
        }
      } else if (Array.isArray(trace[t])) {
        if (await this.recursiveFindInTrace(trace[t], operation) === true) {
          return true
        }
      }
    }

    return false
  }
}

OpScannerCommand.description = `Describe the command here
...
Extra documentation goes here
`

OpScannerCommand.flags = {
  // add --version flag to show CLI version
  version: flags.version({
    char: 'v',
  }),
  // add --help flag to show CLI version
  help: flags.help({
    char: 'h',
  }),
  contractList: flags.string({
    default: 'contract-list.txt',
    description: 'file name with list of contracts to scan',
  }),
  operation: flags.string({
    default: 'CALL',
    description: 'scan for this command',
  }),
  func: flags.string({
    default: 'transferFrom',
    description: 'function to test opcodes for',
  }),
}

module.exports = OpScannerCommand
