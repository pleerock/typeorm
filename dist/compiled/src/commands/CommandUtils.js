"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var tslib_1 = require("tslib");
var fs = require("fs");
var path = require("path");
var mkdirp = require("mkdirp");
/**
 * Command line utils functions.
 */
var CommandUtils = /** @class */ (function () {
    function CommandUtils() {
    }
    /**
     * Creates directories recursively.
     */
    CommandUtils.createDirectories = function (directory) {
        return new Promise(function (ok, fail) { return mkdirp(directory, function (err) { return err ? fail(err) : ok(); }); });
    };
    /**
     * Creates a file with the given content in the given path.
     */
    CommandUtils.createFile = function (filePath, content, override) {
        if (override === void 0) { override = true; }
        return tslib_1.__awaiter(this, void 0, void 0, function () {
            return tslib_1.__generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, CommandUtils.createDirectories(path.dirname(filePath))];
                    case 1:
                        _a.sent();
                        return [2 /*return*/, new Promise(function (ok, fail) {
                                if (override === false && fs.existsSync(filePath))
                                    return ok();
                                fs.writeFile(filePath, content, function (err) { return err ? fail(err) : ok(); });
                            })];
                }
            });
        });
    };
    /**
     * Reads everything from a given file and returns its content as a string.
     */
    CommandUtils.readFile = function (filePath) {
        return tslib_1.__awaiter(this, void 0, void 0, function () {
            return tslib_1.__generator(this, function (_a) {
                return [2 /*return*/, new Promise(function (ok, fail) {
                        fs.readFile(filePath, function (err, data) { return err ? fail(err) : ok(data.toString()); });
                    })];
            });
        });
    };
    CommandUtils.fileExists = function (filePath) {
        return tslib_1.__awaiter(this, void 0, void 0, function () {
            return tslib_1.__generator(this, function (_a) {
                return [2 /*return*/, fs.existsSync(filePath)];
            });
        });
    };
    return CommandUtils;
}());
exports.CommandUtils = CommandUtils;
//# sourceMappingURL=CommandUtils.js.map