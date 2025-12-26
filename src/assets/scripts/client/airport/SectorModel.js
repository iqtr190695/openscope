
import BaseModel from '../base/BaseModel';
import _random from 'lodash/random';
import _isString from 'lodash/isString';
import _get from 'lodash/get';
import {
    isEmptyOrNotArray,
    isEmptyOrNotObject
} from '../utilities/validatorUtilities';
import {
    radio_spellOut
} from '../utilities/radioUtilities';


/**
 * A video map item, containing a collection of map lines
 *
 * Defines a video map layer referenced by an `AirportModel` that
 * contains the map lines to be drawn by the `CanvasController`,
 * as well as a name describing the map contents and a flag
 * allowing rendering of the layer to be suppressed.
 *
 * @class SectorModel
 */
export default class SectorModel extends BaseModel {
    /**
     * @for SectorModel
     * @constructor
     * @param sectorObject {object}
     */
    constructor(sectorObject) {
        super();

        /**
         * Sector identifier
         *
         * @for SectorModel
         * @property sectorID
         * @type {string}
         * @default []
         */
        this.sectorID = _get(sectorObject, "sectorID");
        if (!_isString(this.sectorID)) {
            throw new TypeError('Invalid sectorID: ' + this.sectorID);
        }

        /**
         * Symbol - single character
         *
         * @for SectorModel
         * @property symbol
         * @type {string}
         * @default []
         */
        this.symbol = _get(sectorObject, "symbol");
        if (!_isString(this.symbol) || this.symbol.length > 1) {
            throw new TypeError('Invalid symbol: ' + this.symbol);
        }

        /**
         * Name aircraft would use, ex. "Indianapolis Center" or "Potomac Approach"
         *
         * @for SectorModel
         * @property nameToA
         * @type {string}
         * @default []
         */
        this.publicName = _get(sectorObject, "publicName");
        if (!_isString(this.publicName)) {
            throw new TypeError('Invalid publicName: ' + this.publicName);
        }

        /**
         * Name someone would use on the shoutline, ex. "North" or "Middletown"
         *
         * @for SectorModel
         * @property name
         * @type {string}
         * @default []
         */
        this.name = _get(sectorObject, "name");
        if (!_isString(this.name)) {
            throw new TypeError('Invalid name: ' + this.name);
        }

        /**
         * Frequency used/owned
         *
         * @for SectorModel
         * @property frequency
         * @type {string}
         * @default []
         */
        this.frequency = _get(sectorObject, "frequency");
        if (!_isString(this.frequency)) {
            throw new TypeError('Invalid frequency: ' + this.frequency);
        }

        /**
         * Facility name for calls from other sector(s) (unimplemented)
         *
         * @for SectorModel
         * @property facility
         * @type {string}
         * @default []
         */
        this.facility = _get(sectorObject, "facility");
        if (!_isString(this.facility)) {
            throw new TypeError('Invalid facility: ' + this.facility);
        }


        /**
         * Line ID for calls from other sector(s) (unimplemented)
         * Can be empty string
         *
         * @for SectorModel
         * @property lineID
         * @type {string}
         * @default []
         */
        this.lineID = _get(sectorObject, "lineID", "");

        /**
         * Whether sector is 'in house' to the main airport sector
         *
         * @for SectorModel
         * @property isInHouse
         * @type {string}
         * @default []
         */
        this.isInHouse = _get(sectorObject, "isInHouse", false);

        return this;
    }

    // ------------------------------ LIFECYCLE ------------------------------

    // ------------------------------ PUBLIC ------------------------------
    contactString() {
        let string = `Contact ${this.nameToAcft} on ${this.frequency}`;
        return string;
    }

    switchString() {
        let string = '';
        switch (_random(0, 2)) {
            case 0:
                string = `${this.frequency}, good day`;
                break;
            case 1:
                string = `Switching, good day`;
                break;
            case 2:
                string = `Over to ${this.nameToAcft}, see ya`;
                break;
        }
        return string;
    }

    // ------------------------------ PRIVATE ------------------------------

}