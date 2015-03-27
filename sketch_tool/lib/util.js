/*
Mixin helper. Sets up a class (intended for use with 'extends') whose prototype
mixes the enumerable/own properties of the arguments' prototypes. Properties are
updated left-to-right, so the right-most class methods have highest priority.
*/
export function baseWithMixins(Base, ...mixins) {
    class NewBase extends Base {}
    Object.assign(NewBase.prototype, ...mixins);
    return NewBase;
}
