/**
 * @author flatline
 */
const Config = require('./../Config');
const Helper = require('./../common/Helper');

const rand                 = Helper.rand;
/**
 * {Number} Amount of mutation probabilities values.
 */
const ORG_PROBS            = Config.orgProbs.length;
/**
 * {Number} Maximum probability value for array of probabilities
 */
const ORG_PROB_MAX_VALUE   = Config.ORG_PROB_MAX_VALUE;
/**
 * {Number} This offset will be added to commands value. This is how we
 * add an ability to use numbers in a code, just putting them as command
 */
const CODE_CMD_OFFS        = Config.CODE_CMD_OFFS;
/**
 * {Number} Amount of supported commands in a code
 */
const CODE_COMMANDS        = Config.CODE_COMMANDS;
/**
 * {Number} Maximum stack size, which may be used for recursion or function parameters
 */
const CODE_MAX_STACK_SIZE  = 30000;
/**
 * {Number} Default amount of mutations
 */
const CODE_MUTATION_AMOUNT = .02;
/**
 * {Number} Last atom in molecule bit mask
 */
const CODE_8_BIT_MASK      = Config.CODE_8_BIT_MASK;
/**
 * {Number} nop command index
 */
const NOP                  = Config.CODE_CMDS.NOP;
const NOP_MOL              = NOP | CODE_8_BIT_MASK;

class Mutations {
    /**
     * Apply mutations to specified organism
     * @param {VM} vm
     * @param {Organism} org
     */
    static mutate(vm, org) {
        const mutCbs    = Mutations._MUTATION_CBS;
        const mutations = ((org.code.length * org.percent) << 0) || 1;
        const prob      = Helper.probIndex;
        for (let m = 0; m < mutations; m++) {mutCbs[prob(org.probs)](vm, org.code, org)}
    }

    static randCmd() {return rand(CODE_COMMANDS) === 0 ? rand(CODE_CMD_OFFS) : rand(CODE_COMMANDS) + CODE_CMD_OFFS}
    
    static _onChange (vm, code, org) {
        const idx    = rand(code.length);
        code[idx]    = (code[idx] & CODE_8_BIT_MASK) ? Mutations.randCmd() | CODE_8_BIT_MASK : Mutations.randCmd();
        const fCount = org.fCount;
        vm.compile(org, false);                     // Safe recompilation without loosing metadata
        org.updateMetadata(idx, idx, 1, fCount);
    }

    static _onDel    (vm, code, org) {
        const idx    = rand(code.length);
        code[idx]    = (code[idx] & CODE_8_BIT_MASK) ? Mutations.randCmd() | CODE_8_BIT_MASK : Mutations.randCmd();
        org.code     = code.splice(idx, 1);
        const fCount = org.fCount;
        vm.compile(org, false);                     // Safe recompilation without loosing metadata
        org.updateMetadata(idx, idx + 1, -1, fCount);
    }

    static _onPeriod (vm, code, org) {if (!Config.codeMutateMutations) {return} org.period = rand(Config.orgMaxAge) + 1}

    static _onPercent(vm, code, org) {if (!Config.codeMutateMutations) {return} org.percent = Math.random() || CODE_MUTATION_AMOUNT}

    static _onProbs  (vm, code, org) {org.probs[rand(ORG_PROBS)] = rand(ORG_PROB_MAX_VALUE) + 1}
    
    static _onInsert (vm, code, org) {
        if (code.length >= Config.orgMaxCodeSize) {return}
        const idx    = rand(code.length);
        org.code     = code.splice(idx, 0, Uint8Array.from([Mutations.randCmd()]));
        const fCount = org.fCount;
        vm.compile(org, false);                     // Safe recompilation without loosing metadata
        org.updateMetadata(idx, idx + 1, 1, fCount);
    }

    /**
     * Takes few lines from itself and inserts them before or after copied
     * part. All positions are random.
     * @return {Number} Amount of added/copied lines
     */
    static _onCopy   (vm, code, org)  {
        const codeLen = code.length;
        const start   = rand(codeLen);
        const end     = start + rand(codeLen - start);
        //
        // Because we use spread (...) operator stack size is important
        // for amount of parameters and we shouldn't exceed it
        //
        if (end - start > CODE_MAX_STACK_SIZE) {return 0}
        //
        // Organism size should be less them codeMaxSize
        //
        if (codeLen + end - start >= Config.orgMaxCodeSize) {return 0}
        //
        // We may insert copied piece before "start" (0) or after "end" (1)
        //
        if (rand(2) === 0) {
            const idx = rand(start);
            const insCode = code.slice(start, end);
            org.code      = code.splice(idx, 0, insCode);
            const fCount = org.fCount;
            vm.compile(org, false);                     // Safe recompilation without loosing metadata
            org.updateMetadata(idx, idx + insCode.length, 1, fCount);
            return end - start;
        }

        const idx     = end + rand(codeLen - end + 1);
        const insCode = code.slice(start, end);
        org.code      = code.splice(idx, 0, insCode);
        const fCount = org.fCount;
        vm.compile(org, false);                     // Safe recompilation without loosing metadata
        org.updateMetadata(idx, idx + insCode.length, 1, fCount);

        return end - start;
    }

    static _onCut    (vm, code, org)  {
        const start = rand(code.length);
        const end   = rand(code.length - start);
        org.code    = code.splice(start, end);
        const fCount = org.fCount;
        vm.compile(org, false);                     // Safe recompilation without loosing metadata
        org.updateMetadata(start, start + end, -1, fCount);
    }

    static _onOff    (vm, code, org) {
        const idx = rand(code.length);
        code[idx] = (code[idx] & CODE_8_BIT_MASK) ? NOP_MOL : NOP;
        const fCount = org.fCount;
        vm.compile(org, false);                     // Safe recompilation without loosing metadata
        org.updateMetadata(idx, idx, 1, fCount);
    }
}

/**
 * Static mutation methods binding. Is used for running specified mutation type
 * @private
 */
Mutations._MUTATION_CBS = [
    Mutations._onChange.bind(this),
    Mutations._onDel.bind(this),
    Mutations._onPeriod.bind(this),
    Mutations._onPercent.bind(this),
    Mutations._onProbs.bind(this),
    Mutations._onInsert.bind(this),
    Mutations._onCopy.bind(this),
    Mutations._onCut.bind(this),
    Mutations._onOff.bind(this)
];
/**
 * {Array} Names of mutation types
 */
Mutations.NAMES = [
    'chen',
    'dele',
    'peri',
    'perc',
    'prob',
    'ins',
    'copy',
    'cut',
    'off'
];

module.exports = Mutations;