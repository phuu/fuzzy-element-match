const utils = {
  identity: x => x,

  /**
   * picks an attribute from an object
   *
   * returns a function that takes an attribute of the argument as an object
   */
  picker: obj => {
    return attr => {
      return obj[attr] || utils.identity;
    };
  }
};

export default utils;
