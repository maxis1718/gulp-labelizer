/*
 * This gulp plugin is to filter files that are not labeled,
 * label them and keep track in labeled.json
 *
 * @example
 * gulp
 *  .src(...)
 *   // will proceed to next pipe
 *   // if a file is not labeled
 *  .pipe(Labelizer.notLabled())
 *
 *  // do some transformations
 *  .pipe(some-other-plugin)
 *
 *  // label the transformed file
 *  .pipe(Labelizer.label())
 *
 *  // save the file hash to labeled.json
 *  .pipe(Labelizer.dump())
 *
 *  .pipe(gulp.dest(...))
 */

const fs = require('fs')
const path = require('path')
const hasha = require('hasha')
const through = require('through2-concurrent')

let record = './labeled.json'
let recordPath = path.join(__dirname, record)
let labeledSet = new Set(_getLabeledFiles())

/*
 * Returns a stream in object mode
 * @param {function} transformer - a stream._transform implementation
 * @returns {object}
 */
function createThroughStream(transformer) {
  return through.obj({
    maxConcurrency: 8
  }, transformer)
}

/*
 * Returns an array of labled file hashes
 * @returns {array}
 */
function _getLabeledFiles() {
  return fs.existsSync(recordPath) ?
    JSON.parse(fs.readFileSync(recordPath)) :
    []
}

/*
 * Filter out a file if it has labeled in records
 * @param {object} file - a vinyl file objects
 * @param {string=} encoding (utf8 by default)
 * @param {function(Error, object)} next - done processing the supplied file
 */
function _filterNotLabled(file, encoding, next) {
  if (file.isNull()) {
    return next(null, file)
  }
  let hasExisted = labeledSet.has(hasha(file.contents))
  return hasExisted ? next() : next(null, file)
}

/*
 * Label a file by adding file content hash to records
 * @param {object} file - a vinyl file objects
 * @param {string=} encoding (utf8 by default)
 * @param {function(Error, object)} next - done processing the supplied file
 */
function _labelFile(file, encoding, next) {
  if (file.isNull()) {
    return next(null, file)
  }
  labeledSet.add(hasha(file.contents))
  return next(null, file)
}

/*
 * Save records to labled.json
 * @param {object} file - a vinyl file objects
 * @param {string=} encoding (utf8 by default)
 * @param {function(Error, object)} next - done processing the supplied file
 */
function _dumpToRecordJSON(file, encoding, next) {
  if (file.isNull()) {
    return next(null, file)
  }
  let jsonStr = JSON.stringify([...labeledSet], null, 2)
  fs.writeFileSync(recordPath, jsonStr)
  return cb(null, file)
}

const Labelizer = {
  notLabled: () => createThroughStream(_filterNotLabled),
  label: () => createThroughStream(_labelFile),
  dump: () => createThroughStream(_dumpToRecordJSON)
}

module.exports = Labelizer
