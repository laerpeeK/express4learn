## 静态方法

1. Object.setPrototypeOf() 静态方法可以将一个指定对象的原型设置为另一个对象或者 null。

2. Object.getOwnPropertyNames() 静态方法返回一个数组，其包含给定对象中所有自有属性（包括不可枚举属性，但不包括使用 symbol 值作为名称的属性）。

3. Object.getOwnPropertyDescriptor() 静态方法返回一个对象，该对象描述给定对象上特定属性（即直接存在于对象上而不在对象的原型链中的属性）的配置。返回的对象是可变的，但对其进行更改不会影响原始属性的配置。

4. Object.defineProperty() 静态方法会直接在一个对象上定义一个新属性，或修改其现有属性，并返回此对象。

5. Object.create() 静态方法以一个现有对象作为原型，创建一个新对象。

6. Object.getPrototypeOf() 静态方法返回指定对象的原型（即内部 [[Prototype]] 属性的值）。

## 原型方法

1.Object.prototype.hasOwnProperty() 方法返回一个布尔值，表示对象自有属性（而不是继承来的属性）中是否具有指定的属性。