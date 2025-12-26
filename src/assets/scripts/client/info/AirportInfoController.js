import $ from 'jquery';
import { leftPad } from '../utilities/generalUtilities';
import { radiansToDegrees } from '../utilities/unitConverters';
import AirportController from '../airport/AirportController';
import SimClockController from './SimClockController';
import EventBus from '../lib/EventBus';
import { INVALID_NUMBER } from '../constants/globalConstants';
import { EVENT } from '../constants/eventNames';
import { AIRPORT_INFO_TEMPLATE } from './airportInfoTemplate';
import { PERFORMANCE } from '../constants/aircraftConstants';

/**
 * @property INFO_VIEW_SELECTORS
 * @type {object<string, string>}
 * @final
 */
const INFO_VIEW_SELECTORS = {
    CLOCK_LABEL: '.js-airportInfo-clock-label',
    CLOCK_VALUE: '.js-airportInfo-clock-value',
    WIND_LABEL: '.js-airportInfo-wind-label',
    WIND_VALUE: '.js-airportInfo-wind-value',
    ALTIMETER_LABEL: '.js-airportInfo-altimeter-label',
    ALTIMETER_VALUE: '.js-airportInfo-altimeter-value',
};

/**
 * SIA
 *
 * @class AirportInfoController
 */
export default class AirportInfoController {
    /**
     * @for AirportInfoController
     * @constructor
     * @param {jQuery|HTML element}
     */
    constructor($element) {
        /**
         * Root DOM element
         *
         * @for AirportInfoController
         * @property $element
         * @type {jQuery|HTML element}
         */
        this.$element = $element;

        /**
         * Information div
         *
         * @for AirportInfoController
         * @property $template
         * @type {jQuery|HTML element}
         */
        this.$template = null;

        /**
         * Information div
         *
         * @for AirportInfoController
         * @property $altimeterView
         * @type {jQuery|HTML element}
         */
        this.$altimeterView = null;

        /**
         * Information div
         *
         * @for AirportInfoController
         * @property $clockView
         * @type {jQuery|HTML element}
         */
        this.$clockView = null;

        /**
         * Information div
         *
         * @for AirportInfoController
         * @property $windView
         * @type {jQuery|HTML element}
         */
        this.$windView = null;

        /**
         * @for AirportInfoController
         * @property altimeter
         * @type {Number}
         */
        this.altimeter = INVALID_NUMBER;

        /**
         * @for AirportInfoController
         * @property icao
         * @type {String}
         */
        this.icao = '';

        /**
         * @for AirportInfoController
         * @property simClockController
         */
        this.simClockController = null;

        /**
         * @for AirportInfoController
         * @property wind
         * @type {String}
         */
        this.wind = '';

        /**
         * Local reference of the event bus
         *
         * @for AirportInfoController
         * @property _eventBus
         * @type {EventBus}
         */
        this._eventBus = EventBus;

        return this.init()
            ._createChildren()
            ._setupHandlers()
            .enable()
            .onAirportChange();
    }

    // ------------------------------ LIFECYCLE ------------------------------

    /**
     * @for AirportInfoController
     * @method init
     * @chainable
     */
    init() {
        this.$template = $(AIRPORT_INFO_TEMPLATE);
        this.$altimeterView = this.$template.find(INFO_VIEW_SELECTORS.ALTIMETER_VALUE);
        this.$clockView = this.$template.find(INFO_VIEW_SELECTORS.CLOCK_VALUE);
        this.$windView = this.$template.find(INFO_VIEW_SELECTORS.WIND_VALUE);
        this.altimeter = INVALID_NUMBER;
        this.icao = '';
        this.simClockController = new SimClockController();
        this.wind = '';
        this._eventBus = EventBus;

        return this;
    }

    /**
     * Set initial element references
     *
     * Should be run once only on instantiation
     *
     * @for StripViewModel
     * @method _createChildren
     * @chainable
     * @private
     */
    _createChildren() {
        this.$element.append(this.$template);

        return this;
    }

    /**
     * @for AirportInfoController
     * @method _setupHandlers
     * @chainable
     * @private
     */
    _setupHandlers() {
        this._onAirportChangeHandler = this.onAirportChange.bind(this);
        this._onWindChangeHandler = this.onWindChange.bind(this);

        return this;
    }

    /**
     * Enable all event handlers
     *
     * @for AirportInfoController
     * @method _enable
     * @chainable
     */
    enable() {
        this._eventBus.on(EVENT.AIRPORT_CHANGE, this._onAirportChangeHandler);
        this._eventBus.on(EVENT.WIND_CHANGE, this._onWindChangeHandler);

        return this;
    }

    /**
     * Disable all event handlers
     *
     * @for AirportInfoController
     * @method _disable
     * @chainable
     */
    disable() {
        this._eventBus.off(EVENT.AIRPORT_CHANGE, this._onAirportChangeHandler);
        this._eventBus.off(EVENT.WIND_CHANGE, this._onWindChangeHandler);

        return this;
    }

    /**
     * @for AirportInfoController
     * @method reset
     * @chainable
     */
    reset() {
        this.$element = null;
        this.$template = null;
        this.altimeter = null;
        this.icao = null;
        this.simClockController = null;
        this.wind = null;
        this._eventBus = null;

        return this;
    }

    // ------------------------------ PUBLIC ------------------------------

    /**
     * Updates the information taken from the AirportModel. Triggered on airport change.
     *
     * @for AirportInfoController
     * @method onAirportChange
     */
    onAirportChange() {
        const airport = AirportController.airport_get();
        AirportController.resetATISCode();
        const windAngle = Math.round(radiansToDegrees(airport.wind.angle));

        this.wind = this._buildWindAndGustReadout({ speed: airport.wind.speed, angle: windAngle });
        this.altimeter = this._generateAltimeterReading();
        this.icao = airport.icao.toUpperCase();

        this._render();
    }

    /**
     * Updates the wind information
     *
     * @for AirportInfoController
     * @method onWindChange
     */
    onWindChange(currentWind) {
        this.wind = this._buildWindAndGustReadout({ speed: currentWind.speed, angle: currentWind.angle });

        this._render();
    }

    /**
     * Updates the clock, called from `AppController#update_pre`
     *
     * @for AirportInfoController
     * @method updateClock
     */
    updateClock() {
        const readout = this.simClockController.buildClockReadout();

        this.$clockView.text(readout);
    }

    // ------------------------------ PRIVATE ------------------------------

    /**
     * Formats the wind angle and speed from object into a string,
     * in the format `${newAngle} ${newSpeed}G${gustSpeed}`.
     *
     * Example output: 270 10G18
     *
     * @for AirportGameInfoView
     * @method _buildWindAndGustReadout
     * @param {Object} wind
     * @returns {String} formatted string
     * @private
     */
    _buildWindAndGustReadout(wind) {
        const minGustStrength = 5;
        const { speed } = wind;
        const { angle } = wind;
        const newAngle = leftPad((angle || 360), 3);
        const newSpeed = leftPad(speed, 2);
        // Creates a "gusting" speed
        const gustStrength = speed * Math.random();
        const gustSpeed = leftPad(Math.round(speed + gustStrength), 2);

        if (gustStrength < minGustStrength) {
            return `${newAngle} ${newSpeed}`;
        }

        return `${newAngle}@${newSpeed}G${gustSpeed}`;
    }

    /**
     * Creates an 'altimeter' reading for the info view
     * +/- 0.4 around DEFAULT_ALTIMETER_IN_INHG
     *
     * @for AirportInfoController
     * @method _generateAltimeterReading
     * @returns {number} the altimeter value
     * @private
     */
    _generateAltimeterReading() {
        // Scale over 0.4 * [0, 1] * [0, 1] to make values near DEFAULT_ALTIMETER_IN_INHG more likely
        let offset = 0.4 * Math.random() * Math.random();
        if (Math.random() > 0.5) {
            offset = -offset;
        }
        const pressure = PERFORMANCE.DEFAULT_ALTIMETER_IN_INHG + offset;

        return pressure.toFixed(2);
    }

    /**
     * Sets the values from the updated airport info.
     *
     * @for AirportInfoController
     * @method _render
     * @private
     */
    _render() {
        const atisCode = AirportController.currentATISCode;
        const sia_static = AirportController.current.sia_static;
        this.$windView.text(`${this.icao} ${this.altimeter} ${this.wind}`);
        this.$altimeterView.text(`${atisCode} ${sia_static}`);
    }
}
