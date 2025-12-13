/* eslint-disable max-len */
import _ceil from 'lodash/ceil';
import _chunk from 'lodash/chunk';
import _clamp from 'lodash/clamp';
import _forEach from 'lodash/forEach';
import _get from 'lodash/get';
import _map from 'lodash/map';
import AirportController from './AirportController';
import RunwayCollection from './runway/RunwayCollection';
import StaticPositionModel from '../base/StaticPositionModel';
import { isValidGpsCoordinatePair } from '../base/positionModelHelpers';
import { degreesToRadians, parseElevation } from '../utilities/unitConverters';
import {
    sin,
    cos
} from '../math/core';
import {
    vectorize2dFromRadians,
    vscale
} from '../math/vector';
import {
    FLIGHT_CATEGORY,
    PERFORMANCE
} from '../constants/aircraftConstants';
import { distance2d } from '../math/distance';

/**
 * @class SatelliteAirportModel
 * 
 * Represents any airport that is not the main airport
 * 
 */
export default class SatelliteAirportModel {
    /**
     * @constructor
     * @param options {object}
     */
    // istanbul ignore next
    constructor(options = {}) {
        /**
         * @property arrivalRunwayModel
         * @type {RunwayModel}
         * @default null
         */
        this.arrivalRunwayModel = null;

        /**
         * @property departureRunwayModel
         * @type {RunwayModel}
         * @default null
         */
        this.departureRunwayModel = null;

        /**
         * Flag for is an airport has been loaded successfully
         *
         * @property loaded
         * @type {boolean}
         * @default false
         */
        this.loaded = true;

        /**
         * Name of the airport
         *
         * @property name
         * @type {string}
         * @default null
         */
        this.name = null;

        /**
         * ICAO identifier of the airport
         *
         * @property icao
         * @type {string}
         * @default null
         */
        this.icao = null;

        /**
         * @property _positionModel
         * @type {StaticPositionModel}
         * @default null
         */
        this._positionModel = null;

        /**
         * Collection of all airport `RunwayModel` objects
         *
         * @property _runwayCollection
         * @type {RunwayCollection}
         * @default null
         */
        this._runwayCollection = null;

        /**
         * @property timeout
         * @type {object}
         */
        this.timeout = {
            runway: null,
            departure: null
        };

        /**
         * current wind settings for an airport
         *
         * @property wind
         * @type {object}
         */
        this.wind = {
            speed: 10,
            angle: 0
        };

        this.init(options);
    }

    /**
     * @property elevation
     * @return {number}
     */
    get elevation() {
        return this._positionModel.elevation;
    }

    /**
     * Provide read-only public access to this._positionModel
     *
     * @for SpawnPatternModel
     * @property position
     * @type {StaticPositionModel}
     */
    get positionModel() {
        return this._positionModel;
    }

    /**
     * Facade to access relative position
     *
     * @for SatelliteAirportModel
     * @property relativePosition
     * @type {array<number>} [kilometersNorth, kilometersEast]
     */
    get relativePosition() {
        return this._positionModel.relativePosition;
    }

    /**
     * Facade to access the airport's position's magnetic declination value
     *
     * @for SatelliteAirportModel
     * @property magneticNorth
     * @return {number}
     */
    get magneticNorth() {
        return this._positionModel.magneticNorth;
    }

    /**
     * Minimum altitude an aircraft can be assigned to.
     *
     * @property minAssignableAltitude
     * @return {number}
     */
    get minAssignableAltitude() {
        return _ceil(this.elevation + 1000, -2);
    }

    /**
     * Minimum descent altitude of an instrument approach
     *
     * This is 200 feet AGL but every airport is at a different elevation
     * This provides easy access to the correct value from within an aircraft
     *
     * @property minDescentAltitude
     * @return {number}
     */
    get minDescentAltitude() {
        return Math.floor(this.elevation + PERFORMANCE.INSTRUMENT_APPROACH_MINIMUM_DESCENT_ALTITUDE);
    }

    /**
     * Maximum altitude an aircraft can be assigned to.
     *
     * @property maxAssignableAltitude
     * @return {number}
     */
    get maxAssignableAltitude() {
        return AirportController.current.ctr_ceiling;
    }

    /**
     * @for SatelliteAirportModel
     * @method init
     * @param data {object}
     */
    init(data) {
        this.name = _get(data, 'name', this.name);
        this.icao = _get(data, 'icao', this.icao).toLowerCase();

        const mainAirportReference = AirportController.current.positionModel;
        let magNorthInfo = _get(data, 'magnetic_north', NaN);
        if (isNaN(magNorthInfo)) {
            magNorthInfo = mainAirportReference.magneticNorth;
        } else {
            magNorthInfo = degreesToRadians(degreesToRadians);
        }

        this.setCurrentPosition(data.position, mainAirportReference, magNorthInfo);

        // this._runwayCollection = new RunwayCollection(data.runways, this._positionModel);
        // this.mapCollection = new MapCollection(data.maps, data.defaultMaps, this.positionModel, this.magneticNorth);

        // this.setActiveRunwaysFromNames(data.arrivalRunway, data.departureRunway);
        // this.updateCurrentWind(data.wind);
    }

    /**
     * @for SatelliteAirportModel
     * @method setCurrentPosition
     * @param gpsCoordinates {array<number>}  [latitude, longitude]
     * @param reference {StaticPositionModel}  position model for main airport
     * @param magneticNorth {number}          magnetic declination (variation), in radians
     */
    setCurrentPosition(gpsCoordinates, reference, magneticNorth) {
        if (!isValidGpsCoordinatePair(gpsCoordinates)) {
            return;
        }

        this._positionModel = new StaticPositionModel(gpsCoordinates, reference, magneticNorth);
    }

    /**
     * @for SatelliteAirportModel
     * @method getWindForRunway
     * @param runway {runwayModel}
     * @return {object} headwind and crosswind
     */
    getWindForRunway(runway) {
        const crosswindAngle = runway.calculateCrosswindAngleForRunway(this.wind.angle);

        return {
            cross: sin(crosswindAngle) * this.wind.speed,
            head: cos(crosswindAngle) * this.wind.speed
        };
    }

    /**
     * Generates a vector representation of the wind at a given altitude.
     * When the altitude is not specified, the airport elevation is used as the assumed altitude.
     *
     * @for SatelliteAirportModel
     * @method getWindVectorAtAltitude
     * @param {number} altitude
     * @returns {array<number, number>}
     */
    getWindVectorAtAltitude(altitude) {
        const { angle, speed } = this.getWindAtAltitude(altitude);
        const windTravelDirection = angle + Math.PI;
        const windVector = vscale(vectorize2dFromRadians(windTravelDirection), speed);

        return windVector;
    }

    /**
     * Set active arrival/departure runways from the runway names
     *
     * @for SatelliteAirportModel
     * @method setActiveRunwaysFromNames
     * @param arrivalRunwayName {string}
     * @param departureRunwayName {string}
     */
    setActiveRunwaysFromNames(arrivalRunwayName, departureRunwayName) {
        const arrivalRunwayModel = this.getRunway(arrivalRunwayName);
        const departureRunwayModel = this.getRunway(departureRunwayName);

        this.setArrivalRunway(arrivalRunwayModel);
        this.setDepartureRunway(departureRunwayModel);
    }

    /**
     * Set the airport's active arrival runway
     *
     * @for SatelliteAirportModel
     * @method setArrivalRunway
     * @param runwayModel {RunwayModel}
     */
    setArrivalRunway(runwayModel) {
        this.arrivalRunwayModel = runwayModel;
    }

    /**
     * Set the airport's active departure runway
     *
     * @for SatelliteAirportModel
     * @method setDepartureRunway
     * @param runwayModel {RunwayModel}
     */
    setDepartureRunway(runwayModel) {
        this.departureRunwayModel = runwayModel;
    }

    /**
     * Get RunwayModel in use for 'arrival' or 'departure', as specified in call
     *
     * @for SatelliteAirportModel
     * @method getActiveRunwayForCategory
     * @param category {string} whether the arrival or departure runway is being queried
     * @return {RunwayModel}
     */
    getActiveRunwayForCategory(category) {
        if (category === FLIGHT_CATEGORY.ARRIVAL) {
            return this.arrivalRunwayModel;
        }

        if (category === FLIGHT_CATEGORY.DEPARTURE) {
            return this.departureRunwayModel;
        }

        if (category === FLIGHT_CATEGORY.OVERFLIGHT) {
            return;
        }

        console.warn('Did not expect a query for runway that applies to aircraft of category ' +
            `'${category}'! Returning the arrival runway (${this.arrivalRunwayModel.name})`);

        return this.arrivalRunwayModel;
    }

    /**
     * Return a `RunwayRelationshipModel` given two runway names
     *
     * @for SatelliteAirportModel
     * @method getRunwayRelationshipForRunwayNames
     * @param  primaryRunwayName {string}
     * @param  comparatorRunwayName {string}
     * @return {RunwayRelationshipModel|undefined}
     */
    getRunwayRelationshipForRunwayNames(primaryRunwayName, comparatorRunwayName) {
        return this._runwayCollection.getRunwayRelationshipForRunwayNames(primaryRunwayName, comparatorRunwayName);
    }

    /**
     * Return a `RunwayModel` for the provided name
     *
     * @for SatelliteAirportModel
     * @method getRunway
     * @param name {string} name of the runway, eg '28R'
     * @return {RunwayModel|null}
     */
    getRunway(name) {
        return this._runwayCollection.findRunwayModelByName(name);
    }

    /**
     * Remove an aircraft from all runway queues
     *
     * @for SatelliteAirportModel
     * @method removeAircraftFromAllRunwayQueues
     * @param  aircraft {AircraftModel}
     */
    removeAircraftFromAllRunwayQueues(aircraftId) {
        return this._runwayCollection.removeAircraftFromAllRunwayQueues(aircraftId);
    }

    /**
     * Reset the queues for ALL runways at once
     *
     * @for SatelliteAirportModel
     * @method resetAllRunwayQueues
     * @returns undefined
     */
    resetAllRunwayQueues() {
        this._runwayCollection.runways.forEach((runwayModel) => runwayModel.resetQueue());
    }

    /**
     *
     * @for SatelliteAirportModel
     * @function distance2d
     * @param point {array} x,y
     * @return {number} distance in km
     */
    distance2d(point) {
        return distance2d(point, this.relativePosition);
    }
}
