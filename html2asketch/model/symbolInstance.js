import Base from './base';

class SymbolInstance extends Base {
  constructor({x, y, width, height, symbolID, id, overrideValues = []}) {
    super({id});
    this._class = 'symbolInstance';
    this._x = x;
    this._y = y;
    this._width = width;
    this._height = height;
    this._symbolID = symbolID;
    this._overrideValues = overrideValues;
  }

  setId(id) {
    this._symbolID = id;
  }

  setOverrideValues(value) {
    this._overrideValues.push(value);
  }

  toJSON() {
    const obj = super.toJSON();

    obj.frame = {
      '_class': 'rect',
      'constrainProportions': false,
      'width': this._width,
      'height': this._height,
      'x': this._x,
      'y': this._y,
    };

    obj.style = {
      '_class': 'style',
      'endDecorationType': 0,
      'miterLimit': 10,
      'startDecorationType': 0,
    };

    obj.symbolID = this._symbolID;
    obj.overrideValues = this._overrideValues;

    return obj;
  }
}

export default SymbolInstance;
