/**
 * Extension of VM class. Adds biologically and physics related commands and into "line"
 * language like "join", "split", "see", "step" and so on. Creates organism population,
 * creates world with canvas and html elements.
 * 
 * @author flatline
 */
const Helper                 = require('./../common/Helper');
const Config                 = require('./../Config');
const VM                     = require('./VM');
const Mutations              = require('./Mutations');
const World                  = require('./World');
const FastArray              = require('./../common/FastArray');

const rand                   = Helper.rand;
const RET_OK                 = Config.CODE_RET_OK;
const RET_ERR                = Config.CODE_RET_ERR;
const ORG_CODE_MAX_SIZE      = Config.orgMaxCodeSize;
const CODE_CMD_OFFS          = Config.CODE_CMD_OFFS;
const IS_ORG_ID              = Config.CODE_ORG_ID;
const DIR                    = Config.DIR;
const WIDTH                  = Config.WORLD_WIDTH - 1;
const HEIGHT                 = Config.WORLD_HEIGHT - 1;
const WIDTH1                 = WIDTH + 1;
const HEIGHT1                = HEIGHT + 1;
const LINE_OFFS              = HEIGHT * WIDTH1;
const MAX_OFFS               = WIDTH1 * HEIGHT1 - 1;     // We need -1 to prevent using offset >= MAX_OFFS ... instead offset > MAX_OFFS
const ORG_MIN_COLOR          = Config.ORG_MIN_COLOR;
const MOL_LAST_ATOM_MASK     = Config.MOL_LAST_ATOM_MASK;
const MOL_LAST_ATOM_SET_MASK = Config.MOL_LAST_ATOM_SET_MASK;

class BioVM extends VM {
    constructor() {
        super(0);

        this.orgs       = new FastArray(this._getOrgsAmount());
        this.orgsMols   = new FastArray(this._getOrgsMolsAmount());
        this.world      = new World({scroll: this._onScroll.bind(this)});
        this.freq       = new Int32Array(Config.worldFrequency);
        //
        // Amount of molecules + organisms should not be greater then amount of dots in a world
        //
        if (this._getOrgsAmount() + this._getOrgsMolsAmount() > WIDTH * HEIGHT - 1) {throw Error('Amount of molecules and organisms is greater then amount of dots in a world. Decrease "molAmount" and "orgAmount" configs')}
        this.addOrgs();
        this.addMols();
    }

    destroy() {
        super.destory();

        this.orgsMols.destroy();
        this.world.destroy();
        this.db && this.db.destroy();

        this.orgsMols = null;
        this.world    = null;
        this.db       = null;
    }

    /**
     * Returns "line" language version
     */
    get version() {return '2.0'}

    get ready() {
        if (this.db) {return this.db.ready}
        return new Promise(resolve => resolve());
    }

    /**
     * @override
     */
    beforeIteration(org) {
        //
        // Resets value of 'say' command
        //
        if (org.freq) {org.freq = this.freq[org.freq] = 0}
    }

    /**
     * @override
     */
    afterIteration(org) {
        if (org.energy < 0 || org.age > Config.orgMaxAge) {
            this.delOrg(org);
            this.addOrg(org.offset, org.code);
        }
        org.energy--;
    }

    /**
     * Runs specified command, which is not a part of standart commands
     * like "add", "inc", "mul", "func", "ret", "end", "ifxx", ...
     * @param {Organism} org Current organism
     * @param {Number} cmd Command to run
     * @override
     */
    runCmd(org, cmd) {
        // eslint-disable-next-line default-case
        switch (cmd) {
            case CODE_CMD_OFFS + 40: {// join
                ++org.line;
                const offset = org.offset + DIR[Math.abs(org.ax) % 8];
                const dot    = this.world.getOrgIdx(offset);
                if (dot < 0) {org.ret = RET_ERR; return}
                const nearOrg = this.orgsMols.ref()[dot];
                if (nearOrg.code.length + org.code.length > ORG_CODE_MAX_SIZE) {org.ret = RET_ERR; return}
                org.code = org.code.push(nearOrg.code);
                //
                // Important: joining new commands into the script may break it, because it's
                // offsets, stack and context may be invalid. Generally, we have to compile
                // it after join. But this process resets stack and current running script line
                // to zero line and script start running from the beginning. To fix this we 
                // add any joined command to the end of script and skip compile. So, next
                // line should not be uncommented:
                // org.compile();
                //
                org.energy += (nearOrg.code.length * Config.energyMultiplier);
                this.delOrg(nearOrg);
                org.ret = RET_OK;
                return;
            }

            case CODE_CMD_OFFS + 41: {// split
                ++org.line;
                if (this.orgsMols.full) {org.ret = RET_ERR; return}
                const offset  = org.offset + DIR[Math.abs(org.ret) % 8];
                if (offset < 0 || offset > MAX_OFFS) {org.ret = RET_ERR; return}
                const dot     = this.world.getOrgIdx(offset);
                if (dot > -1) {org.ret = RET_ERR; return} // organism on the way
                const code = org.code;
                const ax   = this._mol2Idx(code, org.ax);
                const bx   = this._mol2Idx(code, org.bx);
                if (ax < 0 || ax > code.length || bx <= ax) {org.ret = RET_ERR; return}
                const newCode = code.subarray(ax, bx);
                org.code = code.splice(ax, bx - ax);
                if (newCode.length < 1 || org.cur() === IS_ORG_ID && this.orgs.full) {org.ret = RET_ERR; return}
                //
                // TODO: This is bad idea to hardcode IS_ORG_ID into organism. Because this mechanism
                // TODO: should be esupported by organism from parent to child
                //
                const clone   = this.addOrg(offset, newCode, org.cur() === IS_ORG_ID);
                this.db && this.db.put(clone, org);
                const energy = clone.code.length * Config.energyMultiplier;
                clone.energy = energy;
                if (Config.codeMutateEveryClone > 0 && rand(Config.codeMutateEveryClone) === 0 && clone.energy) {
                    Mutations.mutate(clone);
                }
                if (org.code.length < 1) {this.delOrg(org); break}
                org.energy  -= energy;
                //
                // Important: after split, sequence of commands have been changed and it may break
                // entire script. Generally, we have to compile new script to fix all offsets
                // and run t again from the beginning. Preprocessing resets the context and stack.
                // So nothing will be running after split command. To fix this, we just assume that 
                // we split commands from tail, which don't affect main (replicator) part. Next line
                // should be commented
                // org.compile();
                // line = 0; 
                //
                org.ret = RET_OK;
                return;
            }

            case CODE_CMD_OFFS + 42: {// step
                ++org.line;
                org.energy -= Math.floor(org.code.length * Config.energyStepCoef);
                let offset = org.offset + DIR[Math.abs(org.ax) % 8];
                if (offset < -1) {offset = LINE_OFFS + org.offset}
                else if (offset > MAX_OFFS) {offset = org.offset - LINE_OFFS}
                if (this.world.getOrgIdx(offset) > -1) {org.ret = RET_ERR; return}
                this.world.moveOrg(org, offset);
                org.ret = RET_OK;
                return;
            }

            case CODE_CMD_OFFS + 43: { // see
                ++org.line;
                const offset = org.offset + org.ax;
                if (offset < 0 || offset > MAX_OFFS) {org.ax = 0; return}
                const dot = this.world.getOrgIdx(offset);
                org.ax = (dot < 0 ? 0 : this.orgsMols.ref()[dot].color || Config.molColor);
                return;
            }

            case CODE_CMD_OFFS + 44: {// say
                ++org.line;
                const freq = Math.abs(org.bx) % Config.worldFrequency;
                this.freq[freq] = org.ax;
                org.freq = freq;
                return;
            }

            case CODE_CMD_OFFS + 45:  // listen
                ++org.line;
                org.ax = this.freq[Math.abs(org.bx) % Config.worldFrequency];
                return;

            case CODE_CMD_OFFS + 46: {// nread
                ++org.line;
                const offset = org.offset + DIR[Math.abs(org.ax) % 8];
                const dot = this.world.getOrgIdx(offset);
                if (dot < 0) {org.ret = RET_ERR; return}
                const nearOrg = this.orgsMols.ref()[dot];
                org.ax = nearOrg.code[org.bx] || 0;
                org.ret = RET_OK;
                return;
            }

            case CODE_CMD_OFFS + 47: {// nsplit
                ++org.line;
                if (this.orgsMols.full) {org.ret = RET_ERR; return}
                const offset  = org.offset + DIR[Math.abs(org.ret) % 8];
                const dot     = this.world.getOrgIdx(offset);
                if (dot < 0) {org.ret = RET_ERR; return}
                const dOffset = this._nearFreePos(org.offset);
                const dDot    = this.world.getOrgIdx(dOffset);
                if (dDot > -1) {org.ret = RET_ERR; return}
                const nearOrg = this.orgsMols.ref()[dot];
                const from    = this._mol2Idx(org.ax);
                const to      = this._mol2Idx(org.bx);
                if (from > to || from < 0 || to < 0) {org.ret = RET_ERR; return}
                const newCode = nearOrg.code.subarray(from, to);
                nearOrg.code  = nearOrg.code.splice(from, to);
                if (newCode.length < 1) {org.ret = RET_ERR; return}
                const cutOrg  = this.addOrg(dOffset, newCode);
                this.db && this.db.put(cutOrg, nearOrg);
                if (nearOrg.code.length < 1) {this.delOrg(nearOrg)}
                const energy = newCode.length * Config.energyMultiplier;
                nearOrg.energy -= energy;
                cutOrg.energy   = energy;
                if (org.code.length < 1) {this.delOrg(org); break}
                org.ret = RET_OK;
                return;
            }

            case CODE_CMD_OFFS + 48: {// get
                ++org.line;
                if (org.ret !== 1 || org.packet) {org.ret = RET_ERR; return}
                const dot = this.world.getOrgIdx(org.offset + DIR[Math.abs(org.ax) % 8]);
                if (dot < 0) {org.ret = RET_ERR; return}
                this.delOrg(org.packet = this.orgsMols.ref()[dot]);
                return;
            }

            case CODE_CMD_OFFS + 49: {// put
                ++org.line;
                if (!org.packet) {org.ret = RET_ERR; return}
                if (this.orgsMols.full) {org.ret = RET_ERR; return}
                const offset = org.offset + DIR[Math.abs(org.ax) % 8];
                const dot    = this.world.getOrgIdx(offset);
                if (dot > -1 || offset < 0 || offset > MAX_OFFS) {org.ret = RET_ERR; return}
                this.addOrg(offset, org.packet.code, !!org.packet.energy);
                this.db && this.db.put(org.packet);
                org.packet = null;
                return;
            }

            case CODE_CMD_OFFS + 50:  // offs
                ++org.line;
                org.ax = org.offset;
                return;

            case CODE_CMD_OFFS + 51: {// color
                ++org.line;
                const newAx = Math.abs(org.ax);
                org.color   = (newAx < ORG_MIN_COLOR ? ORG_MIN_COLOR : newAx) % 0xffffff;
                return;
            }

            case CODE_CMD_OFFS + 52: {// anab
                ++org.line;
                const m1Offs = this._mol2Idx(org.ax);
                const m2Offs = this._mol2Idx(org.bx);
                if (m1Offs > m2Offs || m1Offs < 0 || m2Offs < 0) {org.ret = RET_ERR; return}
                const m1EndOffs = this._getMolLastIdx(m1Offs);
                const m2EndOffs = this._getMolLastIdx(m2Offs);
                let code = org.code;
                const cutCode = code.subarray(m2Offs, m2EndOffs);
                //
                // Important! We assume that this code change does not affect main
                // code. Only food part. This is why we dont call org.compile()
                //
                code = code.splice(m2Offs, m2EndOffs - m2Offs);
                code = code.splice(m1EndOffs, 0, cutCode);
                org.energy -= Config.energyMultiplier;
                code[m1EndOffs] &= MOL_LAST_ATOM_SET_MASK;
                org.code = code;
                org.ret = RET_OK;

                return;
            }

            case CODE_CMD_OFFS + 53: {// catab
                ++org.line;
                // eslint-disable-next-line no-useless-return
                return;
            }
        }
    }

    /**
     * Is called at the end of run() method to do post processing
     * @override
     */
    afterRun() {
        if (this.orgs.items < 1) {this.addOrgs()}
    }

    /**
     * Creates one organism or molecule depending on isOrg parameter. In case
     * of organism extends it with additional properties like offset, color,...
     * @param {Number} offset Offset in a world
     * @param {Uint8Array} code Code to set
     * @param {Boolean} isOrg Organism or molecule
     * @override
     */
    addOrg (offset, code, isOrg = false) {
        const orgsMols = this.orgsMols;
        const org = super.addOrg(isOrg ? this.orgs.freeIndex : null, code, !isOrg);
        //
        // Extends organism properties
        //
        org.offset   = offset;
        org.molIndex = orgsMols.freeIndex;
        if (isOrg) {
            org.color  = Config.ORG_MIN_COLOR;
            org.packet = null;
            org.energy = code.length * Config.energyMultiplier;
            org.compile();
        }

        orgsMols.add(org);
        this.world.org(offset, org);

        return org;
    }

    /**
     * Removes organism from the world totally. Places "packet" organism
     * instead original if exists on the same position.
     * @param {Organism} org Organism to remove
     * @override
     */
    delOrg(org) {
        if (org.hasOwnProperty('energy')) {
            this._delFromOrgsMols(org.molIndex);
            super.delOrg(org);
        }
        org.energy = 0;
        org.energy  = false;
        this.world.empty(org.offset);
        //
        // Extracts all packet organisms recursively
        //
        let packet  = org.packet;
        const world = this.world;
        while (packet) {
            const offset = rand(MAX_OFFS);
            if (world.getOrgIdx(offset) > -1) {continue}
            this.addOrg(offset, packet.code, !!packet.energy);
            packet = packet.packet;
        }
    }

    /**
     * Creates organisms with amount specified in config
     */
    addOrgs() {
        const world = this.world;
        const code  = Config.CODE_LUCA;
        let orgs    = Config.orgAmount;
        while (orgs-- > 0) {
            const offset = rand(MAX_OFFS);
            if (world.getOrgIdx(offset) > -1) {orgs++; continue}
            const luca = this.addOrg(offset, code.slice(), true);
            this.db && this.db.put(luca);
        }
    }

    /**
     * Creates molecules with amount specified in config. Molecules should 
     * be created only once. They are always in a world (not disappear).
     */
    addMols() {
        const world   = this.world;
        const cfg     = Config;
        let molecules = cfg.molAmount;
        while (molecules-- > 0) {
            const offset = rand(MAX_OFFS);
            if (world.getOrgIdx(offset) > -1) {molecules++; continue}
            const org = this.addOrg(offset, this._getMolCode());
            this.db && this.db.put(org);
        }
    }

    /**
     * Removes organism or molecule from organisms and molecules array
     * @param {Number} index Organism or molecule index
     */
    _delFromOrgsMols(index) {
        const movedOrg = this.orgsMols.del(index);
        if (movedOrg) {
            movedOrg.molIndex = index;
            this.world.setItem(movedOrg.offset, index);
        }
    }

    /**
     * Generates random code and code based on organism parts
     * @returns {Array}
     * @private
     */
    _getMolCode() {
        const size = Config.molCodeSize;
        if (Math.random() > .5) {
            const code = new Uint8Array(size);
            for (let i = 0; i < size; i++) {code[i] = Mutations.randCmd()}
            //
            // Sets last atom bit on
            //
            code[size - 1] |= Config.MOL_LAST_ATOM_MASK;
            return code;
        }
        let   code  = Config.CODE_LUCA;
        const len   = code.length;
        const start = Math.floor(Math.random() * (len - size));
        code = code.slice(start, start + size);
        //
        // Sets last atom bit on
        //
        code[size - 1] |= Config.MOL_LAST_ATOM_MASK;

        return code;
    }

    /**
     * Returns maximum amount of molecules and organisms according to config
     * @return {Number} max amount
     */
    _getOrgsMolsAmount() {return Config.molAmount + Config.orgAmount + 1}

    /**
     * Returns maximum amount of organisms only according to config and amount of molecules
     * @return {Number} max amount
     */
    _getOrgsAmount() {return Math.round(Config.molAmount * Config.molCodeSize / (Config.CODE_LUCA.length || 1)) + Config.orgAmount + 1}

    /**
     * Converts molecule index to absolute index in a code array.
     * @param {Uint8Array} code Code
     * @param {Number} molIndex Index of molecule
     * @return {Number|-1} index of first atom or -1 if no last atom found
     */
    _mol2Idx(code, molIndex) {
        for (let i = 0, len = code.length; i < len; i++) {
            if ((code[i] & MOL_LAST_ATOM_MASK) && --molIndex < 1) {
                return i;
            }
        }
        return -1;
    }

    /**
     * Returns index of last atom in molecule in a code
     * @param {Uint8Array} code Code we a looking in
     * @param {Number} index Index of first atom in molecule
     */
    _getMolLastIdx(code, index) {
        // eslint-disable-next-line no-empty
        while (code[index++] & MOL_LAST_ATOM_MASK === 0) {}
        return index;
    }

    /**
     * Returns free dot offset near specified offset
     * @param {Number} offset Absolute dot offset
     * @return {Number} Free dot offset or -1 if no free offset near specified
     */
    _nearFreePos(offset) {
        const world = this.world;
        
        for (let i = 0; i < 8; i++) {
            if (world.getOrgIdx(offset + DIR[i++]) === -1) {
                return offset + DIR[i++];
            }
        }

        return -1;
    }

    /**
     * Is called on pressing one of arrow buttons. Scrolls world inside canvas
     * to appropriate direction till the it's edge and stops at the end or beginning.
     * @param {MouseEvent} e
     */
    // TODO: this method should be in World class
    _onScroll(e) {
        const world  = this.world;
        const width  = Config.WORLD_CANVAS_WIDTH;
        const row    = Config.WORLD_WIDTH  - width;
        const col    = Config.WORLD_HEIGHT - Config.WORLD_CANVAS_HEIGHT;

        switch (e.which) {
            // TODO: not done
            case 37: if ((world.viewX -= Config.worldScrollValue) < 0)    {world.viewX = 0;   this._onHScroll()}  break; // left
            case 39: if ((world.viewX += Config.worldScrollValue) >= row) {world.viewX = row; this._onHScroll()} break; // right
            case 38: if ((world.viewY -= Config.worldScrollValue) < 0)    {world.viewY = 0;   this._onVScroll(true)}  break; // up
            case 40: if ((world.viewY += Config.worldScrollValue) >= col) {world.viewY = col; this._onVScroll(false)} break; // down
            default: return;
        }

        let   offs     = world.viewOffs = world.viewY * Config.WORLD_WIDTH + world.viewX;
        const canvas   = world.canvas;
        const orgs     = this.orgsMols.ref();
        const molColor = Config.molColor;
        //
        // Copy world's part into the canvas accodring to new scroll offsets
        //
        for (let y = 0, height = Config.WORLD_CANVAS_HEIGHT; y < height; y++) {
            const yOffs = y * width;
            for (let x = 0; x < width; x++) {
                const org = world.getOrgIdx(offs++);
                canvas.dot(yOffs + x, org === -1 ? 0x000000 : orgs[org].color || molColor);
            }
            offs += row;
        }
        world.viewX1    = world.viewX + width - 1;
        world.viewOffs1 = world.viewOffs + (Config.WORLD_CANVAS_HEIGHT - 1) * Config.WORLD_WIDTH + row + Config.WORLD_CANVAS_WIDTH - 1;

        return true;
    }

    // TODO: not done
    _onHScroll() {
        
    }

    // TODO: not done
    _onVScroll() {

    }
}

module.exports = BioVM;