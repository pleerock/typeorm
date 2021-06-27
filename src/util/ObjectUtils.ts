export class ObjectUtils {
  /**
   * Copy the values of all of the enumerable own properties from one or more source objects to a
   * target object.
   * @param target The target object to copy to.
   * @param source The source object from which to copy properties.
   */
  static assign<T, U>(target: T, source: U): void;

  /**
   * Copy the values of all of the enumerable own properties from one or more source objects to a
   * target object.
   * @param target The target object to copy to.
   * @param source1 The first source object from which to copy properties.
   * @param source2 The second source object from which to copy properties.
   */
  static assign<T, U, V>(target: T, source1: U, source2: V): void;

  /**
   * Copy the values of all of the enumerable own properties from one or more source objects to a
   * target object.
   * @param target The target object to copy to.
   * @param source1 The first source object from which to copy properties.
   * @param source2 The second source object from which to copy properties.
   * @param source3 The third source object from which to copy properties.
   */
  static assign<T, U, V, W>(target: T, source1: U, source2: V, source3: W): void;

  /**
   * Copy the values of all of the enumerable own properties from one or more source objects to a
   * target object.
   * @param target The target object to copy to.
   * @param sources One or more source objects from which to copy properties
   */
  static assign(target: object, ...sources: any[]): void {
    for (const source of sources) {
      for (const prop of Object.getOwnPropertyNames(source)) {
          (target as any)[prop] = source[prop];
      }
    }
  }
}
