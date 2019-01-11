describe('src/common/FastArray', () => {
    const FastArray = require('./FastArray');
    const size      = 10;
    let   fa;

    beforeEach(() => {fa = new FastArray(size)});
    afterEach (() => {fa.destroy(); fa = null});

    it('Checking creation', () => {
        expect(fa.size).toEqual(size);
        expect(fa.items).toEqual(0);
        expect(fa.freeIndex).toEqual(size - 1);
        expect(fa.added()).toEqual(undefined);
    });

    it('Checking destroy', () => {
        const fSize = 3;
        const fa1   = new FastArray(fSize);
        expect(fa1.size).toEqual(fSize);
        fa1.destroy();
        expect(fa1.items <= 0).toBe(true);
        expect(fa1.size).toEqual(null);
        fa1.add({});
        expect(fa1.items <= 0).toBe(true);
    });

    it('Checking length getter', () => {
        expect(fa.items).toEqual(0);
        fa.add({});
        expect(fa.items).toEqual(1);
        fa.get(size - 1);
        expect(fa.items).toEqual(1);
        fa.del(size - 1);
        expect(fa.items).toEqual(0);
        fa.resize(size * 2);
        expect(fa.items).toEqual(0);
        fa.add({});
        expect(fa.items).toEqual(1);
        fa.resize(size);
        expect(fa.items).toEqual(0);
        fa.add({});
        fa.add({});
        expect(fa.items).toEqual(2);
        fa.del(size - 1);
        fa.del(size - 2);
        expect(fa.items).toEqual(0);
    });

    it('Checking size getter', () => {
        expect(fa.size).toEqual(size);
        fa.add({});
        expect(fa.size).toEqual(size);
        fa.del(size - 1);
        expect(fa.size).toEqual(size);

        for (let i = 0; i < size; i++) {fa.add({})}
        expect(fa.size).toEqual(size);
        fa.add([]);
        expect(fa.size).toEqual(size);

        fa.resize(size - 1);
        expect(fa.size).toEqual(size - 1);
    });

    it('Checking freeIndex getter', () => {
        fa.add({});
        expect(fa.freeIndex).toEqual(size - 2);
        fa.del(size - 1);
        expect(fa.freeIndex).toEqual(size - 1);
        for (let i = 0; i < size; i++) {fa.add({})}
        expect(fa.freeIndex).toEqual(undefined);
        fa.del(size - 1);
        expect(fa.freeIndex).toEqual(size - 1);
    });

    it('Checking add() method', () => {
        const obj = {};
        fa.add(obj);
        expect(fa.items).toEqual(1);
        expect(fa.added()).toEqual(obj);
        fa.del(size - 1);
        expect(fa.get(size - 1)).toEqual(null);

        for (let i = 0; i < size; i++) {fa.add({})}
        expect(fa.items).toEqual(size);
    });

    it('Checking get() method', () => {
        const obj = {};
        expect(fa.get(size - 1)).toEqual(null);
        expect(fa.get(size - 1)).toEqual(null);
        fa.add(obj);
        expect(fa.get(size - 1)).toEqual(obj);
        expect(fa.get(size - 1)).toEqual(obj);
        fa.del(size - 1);
        expect(fa.get(size - 1)).toEqual(null);
        fa.add(obj);
        expect(fa.get(size - 1)).toEqual(obj);
        fa.resize(size - 1);
        expect(fa.get(size - 1)).toEqual(undefined);
    });

    it('Checking del() method', () => {
        const obj = {};
        fa.add(obj);
        expect(fa.added()).toEqual(obj);
        fa.del(size - 1);
        expect(fa.added()).toEqual(undefined);
        fa.del(size - 1);
        expect(fa.added()).toEqual(undefined);
        fa.del(size);
        expect(fa.added()).toEqual(undefined);
    });

    it('Checking added() method', () => {
        const obj = {};
        expect(fa.added()).toEqual(undefined);
        fa.add(obj);
        expect(fa.added()).toEqual(obj);
        expect(fa.added()).toEqual(obj);
        fa.del(size - 1);
        expect(fa.added()).toEqual(undefined);
        fa.add(obj);
        expect(fa.added()).toEqual(obj);
        fa.resize(size + 1);
        expect(fa.added()).toEqual(obj);
    });

    it('Checking resize() method', () => {
        const obj = {};
        fa.add(obj);
        expect(fa.added()).toEqual(obj);
        fa.resize(size + 1);
        expect(fa.added()).toEqual(obj);
    });

    it('Checking loop through array items', () => {
        let sum = 0;
        for (let i = 0; i < size; i++) {
            sum += i;
            fa.add(i);
        }
        expect(fa.items).toEqual(size);

        let sum1 = 0;
        for (let i = 0; i < size; i++) {
            sum1 += fa.get(i)
        }
        expect(sum).toEqual(sum1);
    });

    it('Checking loop through array items with add/remove items', () => {
        for (let i = 0; i < size; i++) {fa.add(i)}
        expect(fa.items).toEqual(size);

        for (let i = 0; i < size; i++) {
            fa.del(i);
            fa.add(i);
            expect(fa.get(i)).toEqual(i);
        }
        expect(fa.items).toEqual(size);
    });
});