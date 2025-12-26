import _has from 'lodash/has';
import _isEmpty from 'lodash/isEmpty';
import _isNaN from 'lodash/isNaN';
import _padEnd from 'lodash/padEnd';
import EventBus from '../lib/EventBus';
import { round } from '../math/core';
import { vadd } from '../math/vector';
import { leftPad } from '../utilities/generalUtilities';
import { EVENT } from '../constants/eventNames';
import { INVALID_NUMBER } from '../constants/globalConstants';
import { DECIMAL_RADIX } from '../utilities/unitConverters';
import {
    DATA_BLOCK_DIRECTION_LENGTH_SEPARATOR,
    DATA_BLOCK_POSITION_MAP
} from '../constants/scopeConstants';
import { THEME } from '../constants/themes';
import {
    FLIGHT_CATEGORY,
    WAKE_TURBULENCE_CATEGORY
 } from '../constants/aircraftConstants';
import SectorModel from '../airport/SectorModel';
import AirportController from '../airport/AirportController';
import random from 'lodash/random';
import TimeKeeper from '../engine/TimeKeeper';

/**
 * A single radar target observed by the radar system and shown on the scope
 * Contains references to the full aircraft model, though only some of that
 * information will be made available to the controller through the scope.
 *
 * @class RadarTargetModel
 */
export default class RadarTargetModel {

    DEFAULT_SYMBOL = '';

    /**
     * @for RadarTargetModel
     * @constructor
     * @param theme {object}
     * @param aircraftModel {AircraftModel}
     */
    constructor(theme, aircraftModel) {
        /**
         * The full aircraft model object that this radar target corresponds to
         *
         * @for RadarTargetModel
         * @property aircraftModel
         * @type {AircraftModel}
         */
        this.aircraftModel = null;

        /**
         * The cruise altitude (hard) assigned in the data block
         *
         * @for RadarTargetModel
         * @property _cruiseAltitude
         * @type {number}
         */
        this._cruiseAltitude = INVALID_NUMBER;

        /**
         * Direction the data block is extended away from the radar target.
         * A value of -1 means to leave at default position.
         *
         * @for RadarTargetModel
         * @property _dataBlockLeaderDirection
         * @type {number}
         */
        this._dataBlockLeaderDirection = INVALID_NUMBER;

        /**
         * Length of the leader line extending away from the radar target and
         * connecting to the data block.
         *
         * @for RadarTargetModel
         * @property _dataBlockLeaderLength
         * @type {number}
         */
        this._dataBlockLeaderLength = theme.DATA_BLOCK.LEADER_LENGTH;

        /**
         * Event Bus reference
         *
         * @for RadarTargetModel
         * @property _eventBus
         * @type {EventBus}
         */
        this._eventBus = EventBus;

        /**
         * Boolean value representing whether the aircraft has a full data block.
         * This is opposed to a partial (PDB), limited (LDB), or other non-full state.
         *
         * @for RadarTargetModel
         * @property _hasFullDataBlock
         * @type {boolean}
         */
        this._hasFullDataBlock = true;

        /**
         * Radius of the halo to be drawn around the radar taget
         *
         * If no halo is to be drawn, the value will be INVALID_NUMBER
         *
         * @for RadarTargetModel
         * @property _haloRadius
         * @type {number}
         * @default INVALID_NUMBER
         */
        this._haloRadius = INVALID_NUMBER;

        /**
         * Boolean value representing whether the full data block is being suppressed
         * on this particular scope.
         *
         * @for RadarTargetModel
         * @property _hasSuppressedDataBlock
         * @type {boolean}
         */
        this._hasSuppressedDataBlock = false;

        /**
         * The altitude (soft) assigned in the data block
         *
         * @for RadarTargetModel
         * @property _assignedAltitude
         * @type {number}
         */
        this._assignedAltitude = INVALID_NUMBER;

        /**
         * SectorModel owner of associated target
         * Null if not associated
         *
         * @for RadarTargetModel
         * @property _owningSector
         * @type {SectorModel}
         */
        this._owningSector = null;

        /**
         * SectorModel receiving handoff
         * isFlashing will be true if set, else false
         *
         * @for RadarTargetModel
         * @property _receivingSector
         * @type {SectorModel}
         */
        this._receivingSector = null;

        /**
         * If target is in a conflict
         *
         * @for RadarTargetModel
         * @property _isCA
         * @type {boolean}
         */
        this._isCA = false;

        /**
         * If target has 'low altitude'
         *
         * @for RadarTargetModel
         * @property _isLA
         * @type {boolean}
         */
        this._isLA = false;

        /**
         * If target is emergency
         *
         * @for RadarTargetModel
         * @property _isEM
         * @type {boolean}
         */
        this._isEM = false;

        /**
         * If target has radio failure
         *
         * @for RadarTargetModel
         * @property _isRF
         * @type {boolean}
         */
        this._isRF = false;

        /**
         * If target is OD (opposite direction)
         *
         * @for RadarTargetModel
         * @property _isOD
         * @type {boolean}
         */
        this._isOD = false;

        /**
         * A 3 character (or less) alphanumeric string that is shown in the data block
         * The scratchpad is used for controller shorthand notes and other purposes
         *
         * @for RadarTargetModel
         * @property _scratchPadText
         * @type {string}
         */
        this._scratchPadText = '';

        /**
         * A 3 character (or less) alphanumeric string that is shown in the data block
         * The scratchpad+ is used for controller shorthand notes and other purposes
         *
         * @for RadarTargetModel
         * @property _scratchPadPlusText
         * @type {string}
         */
        this._scratchPadPlusText = '';

        /**
         * Timeout id if set, controls handoff acceptance
         *
         * @for RadarTargetModel
         * @property _handoffTimeoutID
         * @type {number}
         */
        this._handoffTimeoutID = INVALID_NUMBER;

        /**
         * Flash timeout in game seconds
         *
         * @for RadarTargetModel
         * @property _handoffTimeoutID
         * @type {number}
         */
        this._flashExpiryTime = INVALID_NUMBER;

        /**
         * Active theme
         *
         * @for RadarTargetModel
         * @property _theme
         * @type {object}
         */
        this._theme = theme;

        this._init(aircraftModel)
            .enable();
    }

    /**
     * Angle away from the radar target to draw the leader line and data block
     *
     * @for RadarTargetModel
     * @property dataBlockLeaderDirection
     * @type {number}
     */
    get dataBlockLeaderDirection() {
        return this._dataBlockLeaderDirection;
    }

    /**
     * Length of leader line connecting radar target and data block
     *
     * @for RadarTargetModel
     * @property dataBlockLeaderLength
     * @type {number}
     */
    get dataBlockLeaderLength() {
        return this._dataBlockLeaderLength;
    }

    /**
     * Get the `PositionModel` for the aircraft associated with the radar target
     *
     * @for RadarTargetModel
     * @property positionModel
     * @type {PositionModel}
     */
    get positionModel() {
        return this.aircraftModel.positionModel;
    }

    /**
     * Get the latest known altitude for the aircraft associated with the radar target
     *
     * @for RadarTargetModel
     * @property positionModel
     * @type {PositionModel}
     */
    get indicatedAltitude() {
        return this.aircraftModel.altitude;
    }

    /**
     * @for RadarTargetModel
     * @property scratchPadText
     * @type {string}
     */
    get scratchPadText() {
        return this._scratchPadText;
    }

    set scratchPadText(text) {
        this._scratchPadText = text.slice(0, 3).toUpperCase();
    }

    /**
     * @for RadarTargetModel
     * @property scratchPadPlusText
     * @type {string}
     */
    get scratchPadPlusText() {
        return this._scratchPadPlusText;
    }

    set scratchPadPlusText(text) {
        this._scratchPadPlusText = text.slice(0, 3).toUpperCase();
    }

    /**
     * @for RadarTargetModel
     * @property haloRadius
     * @type {number}
     */
    get haloRadius() {
        return this._haloRadius;
    }

    /**
     * @for RadarTargetModel
     * @property hasHalo
     * @type {boolean}
     */
    get hasHalo() {
        return this._haloRadius > 0;
    }

    get symbol() {
        let symbol = this.DEFAULT_SYMBOL;
        if (this._owningSector) {
            symbol = this._owningSector.symbol;
        }
        return symbol;
    }

    get isInFlash() {
        if (this._receivingSector && this._receivingSector == AirportController.current.currentSector) {
            // 'We' are being flashed the target as the receiving sector
            return true;
        }
        if (this._flashExpiryTime != INVALID_NUMBER && this._flashExpiryTime > TimeKeeper.gameTimeMilliseconds) {
            // We are within 10s since handoff accepted by new sector
            return true;
        }
        return false;
    }

    /**
     * Complete initialization tasks
     *
     * @for RadarTargetModel
     * @method _init
     * @param theme {object}
     * @param aircraftModel {AircraftModel}
     * @private
     * @chainable
     */
    _init(aircraftModel) {
        this.aircraftModel = aircraftModel;
        this._cruiseAltitude = aircraftModel.fms.flightPlanAltitude;
        this._dataBlockLeaderDirection = this._theme.DATA_BLOCK.LEADER_DIRECTION;
        this._dataBlockLeaderLength = this._theme.DATA_BLOCK.LEADER_LENGTH;

        if (aircraftModel.category == FLIGHT_CATEGORY.DEPARTURE) {
            this._owningSector = AirportController.current.currentSector;
        } else {
            this._receivingSector = AirportController.current.currentSector;
        }

        this.setDefaultScratchpad();

        return this;
    }

    /**
    * Disable handlers
    *
    * @for RadarTargetModel
    * @method enable
    * @chainable
    */
    enable() {
        this._eventBus.on(EVENT.SET_THEME, this._setTheme);

        return this;
    }

    /**
    * Enable handlers
    *
    * @for RadarTargetModel
    * @method disable
    * @chainable
    */
    disable() {
        this._eventBus.off(EVENT.SET_THEME, this._setTheme);

        return this;
    }

    /**
    * Reset all properties to their default state
    *
    * @for RadarTargetModel
    * @method reset
    * @chainable
    */
    reset() {
        this.aircraftModel = null;
        this._cruiseAltitude = INVALID_NUMBER;
        this._dataBlockLeaderDirection = INVALID_NUMBER;
        this._dataBlockLeaderLength = this._theme.DATA_BLOCK.LEADER_LENGTH;
        this._hasFullDataBlock = true;
        this._haloRadius = INVALID_NUMBER;
        this._hasSuppressedDataBlock = false;
        this._assignedAltitude = INVALID_NUMBER;
        this._owningSector = null;

        cancelHandoff();
        this._receivingSector = null;
        this._flashExpiryTime = INVALID_NUMBER;

        this._isCA = false;
        this._isLA = false;
        this._isEM = false;
        this._isRF = false;
        this._isOD = false;

        return this;
    }

    /**
     * Assign a new "hard" altitude
     *
     * @for RadarTargetModel
     * @param altitude {number}
     * @return {array} [success of operation, system's response]
     */
    amendAltitude(altitude) {
        this._cruiseAltitude = altitude;

        return [true, 'AMEND ALTITUDE'];
    }

    /**
     * Accept handoff if receiving, else take it back
     * (Infer refers to either acceptance or takeback based on context)
     *
     * @for RadarTargetModel
     * @param altitude {number}
     * @return {array} [success of operation, system's response]
     */
    inferHandoff() {
        if (this._owningSector && this._owningSector == AirportController.current.currentSector && this._receivingSector != null) {
            this.cancelHandoff();
            return [true, 'CANCEL HANDOFF'];
        } else if (this._receivingSector && this._receivingSector == AirportController.current.currentSector) {
            this._owningSector = this._receivingSector;
            this._receivingSector = null;
            this.aircraftModel.transferCommunications();
            return [true, 'ACCEPT HANDOFF'];
        }
        // No handoff action needed
        return [true, null];
    }

    handoffTo(sector) {
        let sectorModel = AirportController.current.sectorLookup[sector];
        if (!sectorModel) {
            // The app shouldn't get here because InputController will infer scratchpad entry before an imaginary sector
            // But if called directly, return false and the reason
            return [false, ('Sector ' + sector + ' is unrecognized')];
        }
        this._receivingSector = sectorModel;
        this._handoffTimeoutID = setTimeout(() => {
            this.handoffAccepted()
        }, random(2000.0, 10000.0));
        return [true, ('HANDOFF ' + sector)];
    }

    cancelHandoff() {
        if (this._handoffTimeoutID != INVALID_NUMBER) {
            clearTimeout(this._handoffTimeoutID);
            this._handoffTimeoutID = INVALID_NUMBER;
            this._flashExpiryTime = INVALID_NUMBER;
            this._receivingSector = null; // Cancel the handoff
        }
    }


    /**
     * Finalize handoff
     * Generally called by timeout set by `handoffTo`
     *
     * @for RadarTargetModel
     * @param altitude {number}
     * @return {array} [success of operation, system's response]
     */
    handoffAccepted() {
        if (this._receivingSector) {
            this._owningSector = this._receivingSector;
        }
        this._flashExpiryTime = TimeKeeper.gameTimeMilliseconds + 10000;
        this._handoffTimeoutID = INVALID_NUMBER;
        this._receivingSector = null;
    }

    /**
     * Generate a string to be used for the first row of a datablock
     *
     * @for RadarTargetModel
     * @method buildDataBlockRowOne
     * @returns {string}
     */
    buildDataBlockRowOne() {
        let dataBlockRowOne = this.aircraftModel.callsign;

        const wtc = Object.values(WAKE_TURBULENCE_CATEGORY).find((WTC) => WTC.LETTER === this.aircraftModel.model.weightClass) ??
            { APPEND: false };

        if (wtc.APPEND) {
            // NOTE: using empty space before the letter on purpose so this gets rendered appropriately within a canvas
            dataBlockRowOne += ` ${wtc.LETTER}`;
        }

        return dataBlockRowOne;
    }

    /**
     * Generate a string to be used for the second row of a datablock
     *
     * @for RadarTargetModel
     * @method buildDataBlockRowTwoPrimaryInfo
     * @returns {string}
     */
    buildDataBlockRowTwoPrimaryInfo() {
        const aircraftAltitude = round(this.aircraftModel.altitude / 100);
        const aircraftSpeed = round(this.aircraftModel.groundSpeed / 10);

        return `${leftPad(aircraftAltitude, 3)} ${leftPad(aircraftSpeed, 2)}`;
    }

    /**
     * Generate a string to be used for the second row of a datablock
     * when the timeshare section is active
     *
     * @for RadarTargetModel
     * @method buildDataBlockRowTwoSecondaryInfo
     * @returns {string}
     */
    buildDataBlockRowTwoSecondaryInfo() {
        const paddedScratchPadText = _padEnd(
            this.scratchPadText,
            this._theme.DATA_BLOCK.SCRATCHPAD_CHARACTER_LIMIT,
            ' '
        );
        const paddedAircraftModelIcao = _padEnd(
            this.aircraftModel.model.icao.toUpperCase(),
            this._theme.DATA_BLOCK.AIRCRAFT_MODEL_ICAO_CHARACTER_LIMIT,
            ' '
        );
        const scratchPadText = paddedScratchPadText.slice(0, this._theme.DATA_BLOCK.SCRATCHPAD_CHARACTER_LIMIT);
        const aircraftModelIcao = paddedAircraftModelIcao.slice(0, this._theme.DATA_BLOCK.AIRCRAFT_MODEL_ICAO_CHARACTER_LIMIT);

        return `${scratchPadText} ${aircraftModelIcao}`;
    }

    /**
     * Abstracts the math from the `CanvasController` used to determine
     * where the center of a datablock should be located
     *
     * @param {number} leaderIntersectionWithBlock
     */
    calculateDataBlockCenter(leaderIntersectionWithBlock) {
        const blockCenterOffset = {
            ctr: [0, 0],
            360: [0, -this._theme.DATA_BLOCK.HALF_HEIGHT],
            45: [this._theme.DATA_BLOCK.HALF_WIDTH, -this._theme.DATA_BLOCK.HALF_HEIGHT],
            90: [this._theme.DATA_BLOCK.HALF_WIDTH, 0],
            135: [this._theme.DATA_BLOCK.HALF_WIDTH, this._theme.DATA_BLOCK.HALF_HEIGHT],
            180: [0, this._theme.DATA_BLOCK.HALF_HEIGHT],
            225: [-this._theme.DATA_BLOCK.HALF_WIDTH, this._theme.DATA_BLOCK.HALF_HEIGHT],
            270: [-this._theme.DATA_BLOCK.HALF_WIDTH, 0],
            315: [-this._theme.DATA_BLOCK.HALF_WIDTH, -this._theme.DATA_BLOCK.HALF_HEIGHT]
        };
        const leaderEndToBlockCenter = blockCenterOffset[this.dataBlockLeaderDirection];

        return vadd(leaderIntersectionWithBlock, leaderEndToBlockCenter);
    }

    /**
     * Change the direction and/or length of the data block leader line
     *
     * @for RadarTargetModel
     * @method moveDataBlock
     * @param commandArguments {string}
     * @return {array} [success of operation, system's response]
     */
    moveDataBlock(commandArguments) {
        if (_isEmpty(commandArguments)) {
            return [false, 'ERR: BAD SYNTAX'];
        }

        let desiredDirection = commandArguments;
        let desiredLength = '';

        if (commandArguments.indexOf(DATA_BLOCK_DIRECTION_LENGTH_SEPARATOR) !== INVALID_NUMBER) {
            const argumentPieces = commandArguments.split(DATA_BLOCK_DIRECTION_LENGTH_SEPARATOR);
            desiredDirection = parseInt(argumentPieces[0], DECIMAL_RADIX);
            desiredLength = parseInt(argumentPieces[1], DECIMAL_RADIX);

            if (_isEmpty(argumentPieces[0])) {
                desiredDirection = '';
            }
        }

        if (desiredLength > 6 || desiredLength < 0) {
            return [false, 'ERR: LEADER LENGTH 0-6 ONLY'];
        }

        if (desiredDirection !== '' && !_isNaN(desiredDirection)) {
            if (!_has(DATA_BLOCK_POSITION_MAP, desiredDirection)) {
                return [false, 'ERR: BAD SYNTAX'];
            }

            this._dataBlockLeaderDirection = DATA_BLOCK_POSITION_MAP[desiredDirection];
        }

        if (desiredLength !== '' && !_isNaN(desiredLength)) {
            this._dataBlockLeaderLength = desiredLength;
        }

        return [true, 'ADJUST DATA BLOCK'];
    }

    /**
     * Clear any existing halo
     *
     * @for RadarTargetModel
     * @method removeHalo
     * @return {array} [success of operation, system's response]
     */
    removeHalo() {
        if (!this.hasHalo) {
            return;
        }

        this._haloRadius = INVALID_NUMBER;

        return [true, 'TOGGLE HALO'];
    }

    /**
     * Set the radius of the halo
     *
     * @for RadarTargetModel
     * @method setHalo
     * @param radius {number}
     * @return {array} [success of operation, system's response]
     */
    setHalo(radius) {
        if (!this.hasHalo) {
            this._haloRadius = radius;

            return [true, 'TOGGLE HALO'];
        }

        if (radius === this._haloRadius || radius < 1) {
            return this.removeHalo();
        }

        this._haloRadius = radius;

        return [true, 'ADJUST HALO'];
    }

    /**
     * Set default value of the scratchpad
     *
     * @for RadarTargetModel
     * @method setDefaultScratchpad
     * @return {array} [success of operation, system's response]
     */
    setDefaultScratchpad() {
        if (!this.aircraftModel) {
            return;
        }
        if (this.aircraftModel.initialScratchpad && this.aircraftModel.initialScratchpad.length > 0) {
            this.scratchPadText = this.aircraftModel.initialScratchpad;
        } else if (this.aircraftModel.isDeparture()) {
            this.scratchPadText = this.aircraftModel.fms.getFlightPlanEntry();
        } else {
            this.scratchPadText = this.aircraftModel.destination.substr(1, 3);
        }

        return [true, 'RESET SCRATCHPAD'];
    }

    /**
     * Set the value of the scratchpad
     *
     * @for RadarTargetModel
     * @method setScratchpad
     * @param scratchPadText {string}
     * @return {array} [success of operation, system's response]
     */
    setScratchpad(scratchPadText) {
        this.scratchPadText = scratchPadText;

        return [true, 'SET SCRATCHPAD'];
    }

    /**
     * Change theme to the specified name
     *
     * This should ONLY be called through the EventBus during a `SET_THEME` event,
     * thus ensuring that the same theme is always in use by all app components.
     *
     * This method must remain an arrow function in order to preserve the scope
     * of `this`, since it is being invoked by an EventBus callback.
     *
     * @for RadarTargetModel
     * @method _setTheme
     * @param themeName {string}
     */
    _setTheme = (themeName) => {
        if (!_has(THEME, themeName)) {
            console.error(`Expected valid theme to change to, but received '${themeName}'`);

            return;
        }

        this._theme = THEME[themeName];
    };
}
