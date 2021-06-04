import { TextEncoder, TextDecoder } from 'util'
import {
  ObjectCreate,
  ObjectDefineProperties,
  FunctionPrototypeBind,
  FunctionPrototypeSymbolHasInstance,
  Symbol,
  SymbolToStringTag,
  RangeError,
  SyntaxError,
  TypeError,
  NumberMAX_SAFE_INTEGER,
  NumberMIN_SAFE_INTEGER,
  NumberPrototypeToString,
  BigInt,
  MathFloor,
  MathMax,
  MathMin,
  String,
  StringPrototypeCharCodeAt,
  StringPrototypeRepeat,
  Uint8Array,
  PrimitivesIsString,
  InstancesIsUint8Array,
  TypesToIntegerOrInfinity,
  TypesToBigInt,
  TypesToLength
} from '@darkwolf/primordials'

const textEncoder = new TextEncoder()
const stringToUint8Array = FunctionPrototypeBind(TextEncoder.prototype.encode, textEncoder)

const textDecoder = new TextDecoder()
const uint8ArrayToString = FunctionPrototypeBind(TextDecoder.prototype.decode, textDecoder)

const alphabetSymbol = Symbol('alphabet')
const alphabetLookupSymbol = Symbol('alphabetLookup')
const baseMapSymbol = Symbol('baseMap')
const baseMapLookupSymbol = Symbol('baseMapLookup')
const encodeToStringSymbol = Symbol('encodeToString')
const decodeFromStringSymbol = Symbol('decodeFromString')

const BASE = 32

const ALPHABET = '0123456789ABCDEFGHIJKLMNOPQRSTUV'

const BITS_PER_CHAR = 5

const PADDING_CHAR = '='
const NEGATIVE_CHAR = '-'

const createAlphabetLookups = alphabet => {
  const lookup = ObjectCreate(null)
  const baseMap = new Uint8Array(BASE)
  const baseMapLookup = ObjectCreate(null)
  for (let i = 0; i < BASE; i++) {
    const char = alphabet[i]
    const charCode = StringPrototypeCharCodeAt(char)
    lookup[char] = i
    baseMap[i] = charCode
    baseMapLookup[charCode] = i
  }
  return {
    lookup,
    baseMap,
    baseMapLookup
  }
}

const isAlphabet = value => {
  if (!PrimitivesIsString(value) || value.length !== BASE) {
    return false
  }
  const alphabetLookup = base32Hex[alphabetLookupSymbol]
  const uniqueCharsLookup = ObjectCreate(null)
  for (let i = 0; i < BASE; i++) {
    const char = value[i]
    if (alphabetLookup[char] === undefined || uniqueCharsLookup[char] !== undefined) {
      return false
    }
    uniqueCharsLookup[char] = i
  }
  return true
}

const toAlphabet = value => {
  if (value === undefined) {
    return ALPHABET
  }
  if (!PrimitivesIsString(value)) {
    throw new TypeError('The alphabet must be a string')
  }
  if (value.length !== BASE) {
    throw new RangeError('The length of the alphabet must be equal to 32')
  }
  const alphabetLookup = base32Hex[alphabetLookupSymbol]
  const uniqueCharsLookup = ObjectCreate(null)
  for (let i = 0; i < BASE; i++) {
    const char = value[i]
    if (alphabetLookup[char] === undefined) {
      throw new SyntaxError(`Invalid character "${char}" at index ${i} for the Base32Hex alphabet`)
    }
    if (uniqueCharsLookup[char] !== undefined) {
      throw new SyntaxError(`The character "${char}" at index ${i} is already in the alphabet`)
    }
    uniqueCharsLookup[char] = i
  }
  return value
}

const isBase32HexString = value => {
  if (!PrimitivesIsString(value)) {
    return false
  }
  const {length} = value
  if (length % 8 !== 0) {
    return false
  }
  const alphabetLookup = base32Hex[alphabetLookupSymbol]
  const lastIndex = length - 1
  let paddingCount = 0
  while (paddingCount < length && paddingCount < 6 && value[lastIndex - paddingCount] === PADDING_CHAR) {
    paddingCount++
  }
  const validLength = length - paddingCount
  for (let i = 0; i < validLength; i++) {
    const char = value[i]
    if (alphabetLookup[char] === undefined) {
      return false
    }
  }
  return true
}

class Base32Hex {
  constructor(alphabet) {
    alphabet = toAlphabet(alphabet)
    const lookups = createAlphabetLookups(alphabet)
    this[alphabetSymbol] = alphabet
    this[alphabetLookupSymbol] = lookups.lookup
    this[baseMapSymbol] = lookups.baseMap
    this[baseMapLookupSymbol] = lookups.baseMapLookup
  }

  get alphabet() {
    return this[alphabetSymbol]
  }

  encodeInt(value) {
    let number = TypesToIntegerOrInfinity(value)
    if (number < NumberMIN_SAFE_INTEGER) {
      throw new RangeError('The value must be greater than or equal to the minimum safe integer')
    } else if (number > NumberMAX_SAFE_INTEGER) {
      throw new RangeError('The value must be less than or equal to the maximum safe integer')
    }
    const alphabet = this[alphabetSymbol]
    if (!number) {
      return alphabet[0]
    }
    const isNegative = number < 0
    if (isNegative) {
      number = -number
    }
    let result = ''
    while (number) {
      result = `${alphabet[number % BASE]}${result}`
      number = MathFloor(number / BASE)
    }
    return isNegative ? `${NEGATIVE_CHAR}${result}` : result
  }

  decodeInt(string) {
    string = String(string)
    const alphabetLookup = this[alphabetLookupSymbol]
    const {length} = string
    const isNegative = string[0] === NEGATIVE_CHAR
    let result = 0
    for (let i = isNegative && length > 1 ? 1 : 0; i < length; i++) {
      const char = string[i]
      const index = alphabetLookup[char]
      if (index === undefined) {
        throw new SyntaxError(`Invalid character "${char}" at index ${i} for Base32Hex encoding`)
      }
      result = result * BASE + index
    }
    return isNegative && result > 0 ? -result : result
  }

  encodeBigInt(value) {
    let bigInt = TypesToBigInt(value)
    const alphabet = this[alphabetSymbol]
    if (!bigInt) {
      return alphabet[0]
    }
    const isNegative = bigInt < 0n
    if (isNegative) {
      bigInt = -bigInt
    }
    let result = ''
    while (bigInt) {
      result = `${alphabet[bigInt % 32n]}${result}`
      bigInt /= 32n
    }
    return isNegative ? `${NEGATIVE_CHAR}${result}` : result
  }

  decodeBigInt(string) {
    string = String(string)
    const alphabetLookup = this[alphabetLookupSymbol]
    const {length} = string
    const isNegative = string[0] === NEGATIVE_CHAR
    let result = 0n
    for (let i = isNegative && length > 1 ? 1 : 0; i < length; i++) {
      const char = string[i]
      const index = alphabetLookup[char]
      if (index === undefined) {
        throw new SyntaxError(`Invalid character "${char}" at index ${i} for Base32Hex encoding`)
      }
      result = result * 32n + BigInt(index)
    }
    return isNegative ? -result : result
  }

  [encodeToStringSymbol](input, start, end) {
    const alphabet = this[alphabetSymbol]
    const length = TypesToLength(input.length)
    let startIndex = 0
    let endIndex = length
    if (start !== undefined) {
      start = TypesToIntegerOrInfinity(start)
      startIndex = start < 0 ? MathMax(0, length + start) : MathMin(start, length)
    }
    if (end !== undefined) {
      end = TypesToIntegerOrInfinity(end)
      endIndex = end < 0 ? MathMax(0, length + end) : MathMin(end, length)
    }
    let result = ''
    let shift = 3
    let carry = 0
    for (let i = startIndex; i < endIndex; i++) {
      const byte = input[i]
      const number = carry | (byte >> shift)
      result += alphabet[number & 0x1f]
      if (shift > BITS_PER_CHAR) {
        shift -= BITS_PER_CHAR
        const number = byte >> shift
        result += alphabet[number & 0x1f]
      }
      shift = BITS_PER_CHAR - shift
      carry = byte << shift
      shift = 8 - shift
    }
    if (shift !== 3) {
      result += alphabet[carry & 0x1f]
    }
    const extraBytes = result.length % 8
    if (extraBytes) {
      result += StringPrototypeRepeat(PADDING_CHAR, 8 - extraBytes)
    }
    return result
  }

  [decodeFromStringSymbol](string, start, end) {
    const alphabetLookup = this[alphabetLookupSymbol]
    const {length} = string
    let startIndex = 0
    let endIndex = length
    if (start !== undefined) {
      start = TypesToIntegerOrInfinity(start)
      startIndex = start < 0 ? MathMax(0, length + start) : MathMin(start, length)
    }
    if (end !== undefined) {
      end = TypesToIntegerOrInfinity(end)
      endIndex = end < 0 ? MathMax(0, length + end) : MathMin(end, length)
    }
    const newLength = MathMax(0, endIndex - startIndex)
    let paddingCount = 0
    if (newLength % 8 === 0) {
      const lastIndex = endIndex - 1
      while (paddingCount < newLength && paddingCount < 6 && string[lastIndex - paddingCount] === PADDING_CHAR) {
        paddingCount++
      }
    }
    const validLength = newLength - paddingCount
    const extraLength = startIndex + validLength
    const result = new Uint8Array(validLength * BITS_PER_CHAR / 8)
    let shift = 8
    let carry = 0
    let index = 0
    for (let i = startIndex; i < extraLength; i++) {
      const char = string[i]
      const charIndex = alphabetLookup[char]
      if (charIndex === undefined) {
        throw new SyntaxError(`Invalid character "${char}" at index ${i} for Base32Hex encoding`)
      }
      const number = charIndex & 0xff
      shift -= BITS_PER_CHAR
      if (shift > 0) {
        carry |= number << shift
      } else if (shift < 0) {
        result[index++] = carry | (number >> -shift)
        shift += 8
        carry = (number << shift) & 0xff
      } else {
        result[index++] = carry | number
        shift = 8
        carry = 0
      }
    }
    if (shift !== 8 && carry !== 0) {
      result[index] = carry
    }
    return result
  }

  encodeText(string, start, end) {
    return this[encodeToStringSymbol](stringToUint8Array(String(string)), start, end)
  }

  decodeText(string, start, end) {
    return uint8ArrayToString(this[decodeFromStringSymbol](String(string), start, end))
  }

  encode(input, start, end) {
    if (!InstancesIsUint8Array(input)) {
      throw new TypeError('The input must be an instance of Uint8Array')
    }
    const baseMap = this[baseMapSymbol]
    const length = TypesToLength(input.length)
    let startIndex = 0
    let endIndex = length
    if (start !== undefined) {
      start = TypesToIntegerOrInfinity(start)
      startIndex = start < 0 ? MathMax(0, length + start) : MathMin(start, length)
    }
    if (end !== undefined) {
      end = TypesToIntegerOrInfinity(end)
      endIndex = end < 0 ? MathMax(0, length + end) : MathMin(end, length)
    }
    const newLength = MathMax(0, endIndex - startIndex)
    const result = new Uint8Array((newLength * 8 + 4) / BITS_PER_CHAR)
    let shift = 3
    let carry = 0
    let index = 0
    for (let i = startIndex; i < endIndex; i++) {
      const byte = input[i]
      const number = carry | (byte >> shift)
      result[index++] = baseMap[number & 0x1f]
      if (shift > BITS_PER_CHAR) {
        shift -= BITS_PER_CHAR
        const number = byte >> shift
        result[index++] = baseMap[number & 0x1f]
      }
      shift = BITS_PER_CHAR - shift
      carry = byte << shift
      shift = 8 - shift
    }
    if (shift !== 3) {
      result[index++] = baseMap[carry & 0x1f]
    }
    return result
  }

  decode(input, start, end) {
    if (!InstancesIsUint8Array(input)) {
      throw new TypeError('The input must be an instance of Uint8Array')
    }
    const baseMapLookup = this[baseMapLookupSymbol]
    const length = TypesToLength(input.length)
    let startIndex = 0
    let endIndex = length
    if (start !== undefined) {
      start = TypesToIntegerOrInfinity(start)
      startIndex = start < 0 ? MathMax(0, length + start) : MathMin(start, length)
    }
    if (end !== undefined) {
      end = TypesToIntegerOrInfinity(end)
      endIndex = end < 0 ? MathMax(0, length + end) : MathMin(end, length)
    }
    const newLength = MathMax(0, endIndex - startIndex)
    const result = new Uint8Array(newLength * BITS_PER_CHAR / 8)
    let shift = 8
    let carry = 0
    let index = 0
    for (let i = startIndex; i < endIndex; i++) {
      const charCode = input[i]
      const charIndex = baseMapLookup[charCode]
      if (charIndex === undefined) {
        throw new SyntaxError(`Invalid byte "${NumberPrototypeToString(charCode, 16)}" at index ${i} for Base32Hex encoding`)
      }
      const number = charIndex & 0xff
      shift -= BITS_PER_CHAR
      if (shift > 0) {
        carry |= number << shift
      } else if (shift < 0) {
        result[index++] = carry | (number >> -shift)
        shift += 8
        carry = (number << shift) & 0xff
      } else {
        result[index++] = carry | number
        shift = 8
        carry = 0
      }
    }
    if (shift !== 8 && carry !== 0) {
      result[index] = carry
    }
    return result
  }

  encodeToString(input, start, end) {
    if (!InstancesIsUint8Array(input)) {
      throw new TypeError('The input must be an instance of Uint8Array')
    }
    return this[encodeToStringSymbol](input, start, end)
  }

  decodeFromString(input, start, end) {
    if (!PrimitivesIsString(input)) {
      throw new TypeError('The input must be a string')
    }
    return this[decodeFromStringSymbol](input, start, end)
  }
}

const isBase32Hex = FunctionPrototypeBind(FunctionPrototypeSymbolHasInstance, null, Base32Hex)

const base32Hex = new Base32Hex()
const encodeInt = FunctionPrototypeBind(Base32Hex.prototype.encodeInt, base32Hex)
const decodeInt = FunctionPrototypeBind(Base32Hex.prototype.decodeInt, base32Hex)
const encodeBigInt = FunctionPrototypeBind(Base32Hex.prototype.encodeBigInt, base32Hex)
const decodeBigInt = FunctionPrototypeBind(Base32Hex.prototype.decodeBigInt, base32Hex)
const encodeText = FunctionPrototypeBind(Base32Hex.prototype.encodeText, base32Hex)
const decodeText = FunctionPrototypeBind(Base32Hex.prototype.decodeText, base32Hex)
const encode = FunctionPrototypeBind(Base32Hex.prototype.encode, base32Hex)
const decode = FunctionPrototypeBind(Base32Hex.prototype.decode, base32Hex)
const encodeToString = FunctionPrototypeBind(Base32Hex.prototype.encodeToString, base32Hex)
const decodeFromString = FunctionPrototypeBind(Base32Hex.prototype.decodeFromString, base32Hex)

ObjectDefineProperties(Base32Hex, {
  BASE: {
    value: BASE
  },
  ALPHABET: {
    value: ALPHABET
  },
  BITS_PER_CHAR: {
    value: BITS_PER_CHAR
  },
  PADDING_CHAR: {
    value: PADDING_CHAR
  },
  NEGATIVE_CHAR: {
    value: NEGATIVE_CHAR
  },
  isBase32Hex: {
    value: isBase32Hex
  },
  isAlphabet: {
    value: isAlphabet
  },
  isBase32HexString: {
    value: isBase32HexString
  },
  encodeInt: {
    value: encodeInt
  },
  decodeInt: {
    value: decodeInt
  },
  encodeBigInt: {
    value: encodeBigInt
  },
  decodeBigInt: {
    value: decodeBigInt
  },
  encodeText: {
    value: encodeText
  },
  decodeText: {
    value: decodeText
  },
  encode: {
    value: encode
  },
  decode: {
    value: decode
  },
  encodeToString: {
    value: encodeToString
  },
  decodeFromString: {
    value: decodeFromString
  }
})
ObjectDefineProperties(Base32Hex.prototype, {
  [SymbolToStringTag]: {
    value: 'Base32Hex'
  }
})

export {
  BASE,
  ALPHABET,
  BITS_PER_CHAR,
  PADDING_CHAR,
  NEGATIVE_CHAR,
  isBase32Hex,
  isAlphabet,
  isBase32HexString,
  encodeInt,
  decodeInt,
  encodeBigInt,
  decodeBigInt,
  encodeText,
  decodeText,
  encode,
  decode,
  encodeToString,
  decodeFromString
}
export default Base32Hex
