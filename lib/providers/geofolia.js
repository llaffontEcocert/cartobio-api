const AdmZip = require('adm-zip')
const { parse } = require('wkt')
const { featureCollection, feature: Feature } = require('@turf/helpers')
const { toWgs84 } = require('reproject')
const { randomInt } = require('crypto')

const IN_HECTARES = 10000

/**
 * Strips a leading byte that breaks `JSON.parse()`, to name the least.
 *
 * @param {string} string
 * @see https://github.com/sindresorhus/strip-bom/blob/main/index.js
 * @see https://en.wikipedia.org/wiki/Byte_order_mark
 * @returns {string}
 */
const stripBOM = (string) => string.charCodeAt(0) === 0xFEFF ? string.slice(1) : string

const excludeFieldsWithoutGeometry = ({ Geography }) => Geography

function convertGeofoliaFieldsToGeoJSON (data) {
  const fields = data.Fields.filter(excludeFieldsWithoutGeometry)

  return featureCollection(fields.map(Field => {
    const id = randomInt(1, Math.pow(2, 48))
    return Feature(
      parse(Field.Geography),
      {
        id,
        remoteId: Field.Id,
        COMMUNE: Field.CityNumber,
        TYPE: Field.RNCropCode.slice(0, 3),
        TYPE_LIBELLE: Field.CropName,
        BIO: undefined,
        SURF: Field.Area / IN_HECTARES,
        NOM: Field.Name,
        NUMERO_I: Field.IsletNum,
        NUMERO_P: Field.Code
      },
      { id }
    )
  }))
}

async function parseGeofoliaArchive (file) {
  const FieldFileEntry = await file
    .then(data => data.toBuffer())
    .then(buffer => new AdmZip(buffer))
    .then(zip => zip.getEntry('Field.Json'))

  const lambert93 = '+proj=lcc +lat_1=49 +lat_2=44 +lat_0=46.5 +lon_0=3 +x_0=700000 +y_0=6600000 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs'

  const parsedJSON = JSON.parse(stripBOM(FieldFileEntry.getData().toString('utf8')))
  const geojson = convertGeofoliaFieldsToGeoJSON(parsedJSON)

  return toWgs84(geojson, lambert93)
}

module.exports = {
  convertGeofoliaFieldsToGeoJSON,
  parseGeofoliaArchive
}
