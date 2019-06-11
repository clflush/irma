/**
 * {Object} Global configuration of IRMA project. Very important idea
 * behind these configs is total amount of energy in a world. It should
 * be a luck of energy to provoke system to grow. To calculate amount of
 * energy dots we have to use formula:
 *
 *   energyDots = ((orgCloneEnergy - 1) * (orgAmount / 2) - (orgAmount / 4) * orgEnergy) / energyValue
 *
 * Some of these configuration parameters may be changed during app work.
 * Some of them - not. See "@constant" mark in a comment.
 *
 * @author flatline
 */
/**
 * {Number} This offset will be added to commands value. This is how we
 * add an ability to use numbers in a code, just putting them as command
 * @constant
 */
// TODO: review all configs
const CMD_OFFS = 128;
const WIDTH    = 1920 * 2;
const HEIGHT   = 1080 * 2;

const Config = {
    /**
     * {Array} Array of increments. Using it we may obtain coordinates of the
     * nearest point depending on one of 8 directions. We use these values in any
     * command related to sight, move, eating and so on. Starts from: uo, up-right,
     * right, right-down,...
     */
    DIR                        : new Int32Array([-WIDTH, -WIDTH + 1, 1, WIDTH + 1, WIDTH, WIDTH - 1, -1, -WIDTH - 1]),
    /**
     * {Number} This offset will be added to commands value. This is how we
     * add an ability to use numbers in a code, just putting them as command
     * @constant
     */
    CODE_CMD_OFFS              : CMD_OFFS,
    /**
     * {Number} Amount of supported commands in a code. This value must be
     * synchronized with real commands amount. See VM.js for details.
     * @constant
     */
    CODE_COMMANDS              : 30,
    /**
     * {Number} Functions call stack size
     */
    CODE_STACK_SIZE            : 300,
    codeLinesPerIteration      : 10,
    codeTimesPerRun            : 10,
    codeCrossoverEveryClone    : 15,
    codeMutateEveryClone       : 10,
    codeDefault                : [], //CMD_OFFS+23, CMD_OFFS, CMD_OFFS+1, CMD_OFFS+2],
    codeRegs                   : 6,

    /**
     * World width in pixels
     * @constant
     */
    WORLD_WIDTH                : WIDTH,
    /**
     * World height in pixels
     * @constant
     */
    WORLD_HEIGHT               : HEIGHT,
    /**
     * {Number} Zoom speed 0..1
     */
    worldZoomSpeed             : 0.1,
    worldCataclysmEvery        : 10,
    /**
     * {Number} Percent of differences between organisms after which global
     * cataclysm mechanism will be run.
     */
    worldOrgsSimilarityPercent : .3,
    /**
     * {Number} Amount of elements in a world
     */
    worldElements              : 100000,
    /**
     * {Boolean} Turns on\off usage of IndexedDB for storing organisms population
     * @constant
     */
    DB_ON                      : false,
    DB_CHUNK_SIZE              : 200,
    /**
     * {Number} Mask to check if some dot is an energy. We use second bit
     * for this. First bit is used to check if it's an organism
     */
    energyValue                : .5,

    /**
     * {Number} Maximum value of every element in orgProbs array
     * @constant
     */
    ORG_PROB_MAX_VALUE         : 50,
    ORG_MASK                   : 0x80000000,
    orgAmount                  : 100000,
    orgMaxAge                  : 20000,
    orgEnergy                  : 49,
    orgCloneEnergy             : 50,
    orgStepEnergy              : .001,
    orgEnergyPeriod            : 0,
    orgColor                   : 0xff0000,
    orgMutationPercent         : .02,
    orgMutationPeriod          : 250000,
    orgMaxCodeSize             : 100,
    orgStartCodeSize           : 64,
    orgMovesInStep             : 5,
    /**
     * {Array} change,del,period,amount,probs,insert,copy,cut
     * Is used for new created organisms. During cloning, all
     * organism properties will be inherited.
     */
    orgProbs                   : new Uint32Array([10,1,2,3,1,5,1,1])
};

module.exports = Config;