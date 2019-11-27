/* eslint-disable global-require */
describe('src/irma/VM', () => {
    const Config    = require('./../Config');
    const oldConfig = JSON.parse(JSON.stringify(Config)); // Config copy
    const WIDTH     = 10;
    const HEIGHT    = 10;
    //
    // This call should be before require('./VM') to setup our 
    // configuration instead of default
    // eslint-disable-next-line no-use-before-define
    _setConfig();
    const BioVM     = require('./BioVM');

    const TG        = Config.CODE_CMD_OFFS;
    const EQ        = Config.CODE_CMD_OFFS+1;
    const NO        = Config.CODE_CMD_OFFS+2;
    const AD        = Config.CODE_CMD_OFFS+3;
    const SU        = Config.CODE_CMD_OFFS+4;
    const MU        = Config.CODE_CMD_OFFS+5;
    const DI        = Config.CODE_CMD_OFFS+6;
    const IN        = Config.CODE_CMD_OFFS+7;
    const DE        = Config.CODE_CMD_OFFS+8;
    const RS        = Config.CODE_CMD_OFFS+9;
    const LS        = Config.CODE_CMD_OFFS+10;
    const RA        = Config.CODE_CMD_OFFS+11;
    const FP        = Config.CODE_CMD_OFFS+12;
    const FN        = Config.CODE_CMD_OFFS+13;
    const FZ        = Config.CODE_CMD_OFFS+14;
    const FG        = Config.CODE_CMD_OFFS+15;
    const FL        = Config.CODE_CMD_OFFS+16;
    const FE        = Config.CODE_CMD_OFFS+17;
    const FNE       = Config.CODE_CMD_OFFS+18;
    const LP        = Config.CODE_CMD_OFFS+19;
    const CA        = Config.CODE_CMD_OFFS+20;
    const FU        = Config.CODE_CMD_OFFS+21;
    const RE        = Config.CODE_CMD_OFFS+22;
    const EN        = Config.CODE_CMD_OFFS+23;
    const RX        = Config.CODE_CMD_OFFS+24;
    const AR        = Config.CODE_CMD_OFFS+25;
    const AN        = Config.CODE_CMD_OFFS+26;
    const OR        = Config.CODE_CMD_OFFS+27;
    const XO        = Config.CODE_CMD_OFFS+28;
    const NT        = Config.CODE_CMD_OFFS+29;
    const FI        = Config.CODE_CMD_OFFS+30;
    const LI        = Config.CODE_CMD_OFFS+39;

    const JO        = Config.CODE_CMD_OFFS+41;
    const SP        = Config.CODE_CMD_OFFS+42;

    let   vm        = null;

    /**
     * Setup default config for tests
     */
    function _setConfig() {
        Object.assign(Config, {
            // constants
            DIR                        : new Int32Array([-WIDTH, -WIDTH + 1, 1, WIDTH + 1, WIDTH, WIDTH - 1, -1, -WIDTH - 1]),
            DB_ON                      : false,
            WORLD_WIDTH                : WIDTH,
            WORLD_HEIGHT               : HEIGHT,
            PLUGINS                    : [],
            // variables
            codeLinesPerIteration      : 1,
            codeRepeatsPerRun          : 1,
            codeMutateEveryClone       : 1000,
            codeMutateMutations        : false,
            CODE_LUCA                   : [],
            worldZoomSpeed             : 0.1,
            worldFrequency             : 10,
            molAmount                  : 1,
            orgAmount                  : 1,
            orgMaxAge                  : 2000000,
            orgMutationPercent         : .02,
            orgMutationPeriod          : 2000001,
            orgMaxCodeSize             : 50,
            orgMaxMemSize              : 128,
            orgProbs                   : new Uint32Array([10,1,3,1,5,1,1]),
            molDecayPeriod             : 1000,
            molDecayDistance           : 60,
            molCodeSize                : 8,
            energyStepCoef             : 0.01,
            energyMultiplier           : 10000
        });
    }

    /**
     * Runs one script from single organism and checks registers on finish
     * @param {Uint8Array} code Code to run
     * @param {Number} ax ax register should be equal this value after run
     * @param {Number} bx bx register should be equal this value after run
     * @param {Number} ret ret register should be equal this value after run
     * @param {Boolean} checkLen If true, then org.code.length === lines
     * @param {Number} lines Amount of lines run after calling vm.run()
     */
    function run(code, ax = 0, bx = 0, ret = 0, checkLen = true, lines = null) {
        Config.codeLinesPerIteration = lines === null ? code.length : lines;
        const org = vm.orgs.get(0);
        org.code  = Uint8Array.from(code).slice(); // code copy
        org.compile();

        expect(org.ax).toBe(0);
        expect(org.bx).toBe(0);
        expect(org.ret).toBe(0);
        expect(org.line).toBe(0);
        vm.run();

        expect(org.ax).toBe(ax);
        expect(org.bx).toBe(bx);
        expect(org.ret).toBe(ret);
        expect(org.code).toEqual(Uint8Array.from(code));
        checkLen && expect(org.line).toEqual(org.code.length);
    }

    beforeEach(() => {
        _setConfig();
        vm = new BioVM();
    });

    afterEach(() => {
        Object.assign(Config, oldConfig);
        vm.destroy();
        vm = null;
    });

    describe('BioVM creation', () => {
        it('Checks BioVM creation', () => {
            const vm1 = new BioVM();

            expect(vm1.orgs.size).toBe(Config.orgAmount);
            expect(vm1.orgsMols.size).toBe(Config.orgAmount + Config.molAmount + 1);
        });
    });

    xdescribe('Scripts run', () => {
        describe('join tests', () => {
            it('Checks joining right organism',  () => {
                Config.molAmount = 0;
                Config.orgAmount = 2;
                const vm1  = new VM();
                const org1 = vm1.orgs.get(0);
                const org2 = vm1.orgs.get(1);

                vm1.world.moveOrg(org1, 0);
                vm1.world.moveOrg(org2, 1);
                org1.code = Uint8Array.from([1,AR,2,JO]);
                org2.code = Uint8Array.from([2]);
                org1.compile();
                org2.compile();
                Config.codeLinesPerIteration = org1.code.length;
                vm1.run();
                expect(vm1.orgs.items).toBe(1);
                expect(org1.code).toEqual(Uint8Array.from([1,AR,2,JO,2]));
                vm1.destroy();
            });
            it('Checks joining empty cell',  () => {
                Config.molAmount = 0;
                Config.orgAmount = 1;
                const vm1  = new VM();
                const org1 = vm1.orgs.get(0);

                vm1.world.moveOrg(org1, 0);
                org1.code = Uint8Array.from([1,AR,2,JO]);
                org1.compile();
                Config.codeLinesPerIteration = org1.code.length;
                vm1.run();
                expect(vm1.orgs.items).toBe(1);
                expect(org1.code).toEqual(Uint8Array.from([1,AR,2,JO]));
                vm1.destroy();
            });
            it('Checks joining if organism is at the edge of the world',  () => {
                Config.molAmount = 0;
                Config.orgAmount = 1;
                const vm1  = new VM();
                const org1 = vm1.orgs.get(0);

                vm1.world.moveOrg(org1, WIDTH - 1);
                org1.code = [1,AR,2,JO];
                org1.compile();
                Config.codeLinesPerIteration = org1.code.length;
                vm1.run();
                expect(vm1.orgs.items).toBe(1);
                expect(org1.code).toEqual([1,AR,2,JO]);
                vm1.destroy();
            });
            it('Checks joining right molecule',  () => {
                Config.molAmount = 1;
                Config.orgAmount = 1;
                const vm1  = new VM();
                const org1 = vm1.orgs.get(0);
                const mol1 = vm1.orgsMols.get(0);

                vm1.world.moveOrg(org1, 0);
                vm1.world.moveOrg(mol1, 1);
                org1.code = Uint8Array.from([1,AR,2,JO]);
                mol1.code = Uint8Array.from([5]);
                org1.compile();
                Config.codeLinesPerIteration = org1.code.length;
                vm1.run();
                expect(vm1.orgs.items).toBe(1);
                expect(org1.code).toEqual(Uint8Array.from([1,AR,2,JO,5]));
                expect(vm1.orgsMols.items).toBe(1);
                vm1.destroy();
            });
        })

        describe('split tests', () => {
            it('Checks basic organism splitting',  () => {
                Config.molAmount = 0;
                const vm1  = new VM();
                const org = vm1.orgs.get(0);
                
                vm1.world.moveOrg(org, 0);
                org.code = Uint8Array.from([2,AR,1,TG,0,SP]);
                org.energy = org.code.length * Config.energyMultiplier;
                org.compile();
                Config.codeLinesPerIteration = org.code.length;
                expect(vm1.world.getOrgIdx(1)).toBe(-1);
                expect(vm1.orgsMols.items).toBe(1);
                expect(vm1.orgs.items).toBe(1);
                vm1.run();
                expect(vm1.orgs.items).toBe(1);
                expect(vm1.orgsMols.items).toBe(2); 
                expect(vm1.world.getOrgIdx(1)).not.toBe(-1);
                expect(org.code).toEqual(Uint8Array.from([AR,1,TG,0,SP]));
                vm1.destroy();
            });
            it('Checks organism splitting fail, because position is not free',  () => {
                Config.molAmount = 0;
                Config.orgAmount = 2;
                const vm1  = new VM();
                const org1 = vm1.orgs.get(0);
                const org2 = vm1.orgs.get(1);
                
                vm1.world.moveOrg(org1, 0);
                vm1.world.moveOrg(org2, 1);
                org1.code = Uint8Array.from([2,AR,1,TG,0,SP]);
                org2.code = Uint8Array.from([2]);
                org1.energy = org1.code.length * Config.energyMultiplier;
                org2.energy = org2.code.length * Config.energyMultiplier;
                org1.compile();
                Config.codeLinesPerIteration = org1.code.length;
                expect(vm1.world.getOrgIdx(1)).not.toBe(-1);
                expect(vm1.orgsMols.items).toBe(2);
                expect(vm1.orgs.items).toBe(2);
                vm1.run();
                expect(vm1.orgs.items).toBe(2);
                expect(vm1.orgsMols.items).toBe(2); 
                expect(vm1.world.getOrgIdx(1)).not.toBe(-1);
                expect(org1.offset).toBe(0);
                expect(org2.offset).toBe(1);
                expect(org1.code).toEqual(Uint8Array.from([2,AR,1,TG,0,SP]));
                vm1.destroy();
            });
            it('Checks organism splitting fail, because orgsMols is full',  () => {
                Config.molAmount = 0;
                const vm1  = new VM();
                const org = vm1.orgs.get(0);
                // split to the right
                vm1.world.moveOrg(org, 0);
                org.code = Uint8Array.from([2,2,AR,1,TG,0,SP]);
                org.energy = org.code.length * Config.energyMultiplier;
                org.compile();
                Config.codeLinesPerIteration = org.code.length;
                expect(vm1.world.getOrgIdx(1)).toBe(-1);
                expect(vm1.orgsMols.items).toBe(1);
                expect(vm1.orgs.items).toBe(1);
                vm1.run();
                expect(vm1.orgs.items).toBe(1);
                expect(vm1.orgsMols.items).toBe(2); 
                expect(vm1.world.getOrgIdx(1)).not.toBe(-1);
                expect(org.code).toEqual(Uint8Array.from([2,AR,1,TG,0,SP]));
                // split to the bottom
                org.code[0] = 4;
                vm1.run();
                expect(vm1.orgs.items).toBe(1);
                expect(vm1.orgsMols.items).toBe(2); 
                expect(vm1.world.getOrgIdx(10)).toBe(-1);
                expect(org.code).toEqual(Uint8Array.from([4,AR,1,TG,0,SP]));

                vm1.destroy();
            });
            it('Checks basic organism splitting fail, because out of the world',  () => {
                Config.molAmount = 0;
                const vm1  = new VM();
                const org = vm1.orgs.get(0);
                
                vm1.world.moveOrg(org, 0);
                org.code = Uint8Array.from([0,AR,1,TG,0,SP]);
                org.energy = org.code.length * Config.energyMultiplier;
                org.compile();
                Config.codeLinesPerIteration = org.code.length;
                expect(vm1.world.getOrgIdx(0)).not.toBe(-1);
                expect(vm1.orgsMols.items).toBe(1);
                expect(vm1.orgs.items).toBe(1);
                vm1.run();
                expect(vm1.orgs.items).toBe(1);
                expect(vm1.orgsMols.items).toBe(1); 
                expect(vm1.world.getOrgIdx(0)).not.toBe(-1);
                expect(org.code).toEqual(Uint8Array.from([0,AR,1,TG,0,SP]));
                vm1.destroy();
            });
            it('Checks basic organism splitting fail, because ax < 0',  () => {
                Config.molAmount = 0;
                const vm1  = new VM();
                const org = vm1.orgs.get(0);
                
                vm1.world.moveOrg(org, 0);
                org.code = Uint8Array.from([2,AR,1,TG,1,NT,SP]);
                org.energy = org.code.length * Config.energyMultiplier;
                org.compile();
                Config.codeLinesPerIteration = org.code.length;
                expect(vm1.world.getOrgIdx(1)).toBe(-1);
                expect(vm1.orgsMols.items).toBe(1);
                expect(vm1.orgs.items).toBe(1);
                vm1.run();
                expect(vm1.orgs.items).toBe(1);
                expect(vm1.orgsMols.items).toBe(1); 
                expect(vm1.world.getOrgIdx(1)).toBe(-1);
                expect(org.code).toEqual(Uint8Array.from([2,AR,1,TG,1,NT,SP]));
                vm1.destroy();
            });
            it('Checks basic organism splitting fail, because ax > org.code.length',  () => {
                Config.molAmount = 0;
                const vm1        = new VM();
                const org        = vm1.orgs.get(0);
                
                vm1.world.moveOrg(org, 0);
                org.code = Uint8Array.from([2,AR,1,TG,100,NT,SP]);
                org.energy = org.code.length * Config.energyMultiplier;
                org.compile();
                Config.codeLinesPerIteration = org.code.length;
                expect(vm1.world.getOrgIdx(1)).toBe(-1);
                expect(vm1.orgsMols.items).toBe(1);
                expect(vm1.orgs.items).toBe(1);
                vm1.run();
                expect(vm1.orgs.items).toBe(1);
                expect(vm1.orgsMols.items).toBe(1); 
                expect(vm1.world.getOrgIdx(1)).toBe(-1);
                expect(org.code).toEqual(Uint8Array.from([2,AR,1,TG,100,NT,SP]));
                vm1.destroy();
            });
            it('Checks basic organism splitting fail, because bx < 0',  () => {
                Config.molAmount = 0;
                const vm1  = new VM();
                const org = vm1.orgs.get(0);
                
                vm1.world.moveOrg(org, 0);
                org.code = Uint8Array.from([2,AR,1,NT,TG,1,SP]);
                org.energy = org.code.length * Config.energyMultiplier;
                org.compile();
                Config.codeLinesPerIteration = org.code.length;
                expect(vm1.world.getOrgIdx(1)).toBe(-1);
                expect(vm1.orgsMols.items).toBe(1);
                expect(vm1.orgs.items).toBe(1);
                vm1.run();
                expect(vm1.orgs.items).toBe(1);
                expect(vm1.orgsMols.items).toBe(1); 
                expect(vm1.world.getOrgIdx(1)).toBe(-1);
                expect(org.code).toEqual(Uint8Array.from([2,AR,1,NT,TG,1,SP]));
                vm1.destroy();
            });
            it('Checks basic organism cloning',  () => {
                Config.molAmount = 0;
                const vm1        = new VM();
                const org        = vm1.orgs.get(0);
                
                vm1.world.moveOrg(org, 10);
                org.code = Uint8Array.from([1,AR,Config.CODE_ORG_ID,PU,1,TG,0,SP,PO]);
                org.energy = org.code.length * Config.energyMultiplier;
                org.compile();
                Config.codeLinesPerIteration = org.code.length;
                expect(vm1.world.getOrgIdx(1)).toBe(-1);
                expect(vm1.orgsMols.items).toBe(1);
                expect(vm1.orgs.items).toBe(1);
                vm1.run();
                expect(vm1.orgs.items).toBe(2);
                expect(vm1.orgsMols.items).toBe(2); 
                expect(vm1.orgs.get(1).energy).toBe(true); 
                expect(vm1.world.getOrgIdx(1)).not.toBe(-1);
                expect(org.code).toEqual(Uint8Array.from([AR,Config.CODE_ORG_ID,PU,1,TG,0,SP,PO]));
                expect(vm1.orgs.get(1).code).toEqual(Uint8Array.from([1]));
                vm1.destroy();
            });
        });
    });
});