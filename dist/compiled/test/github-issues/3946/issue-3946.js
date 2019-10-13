"use strict";
var _this = this;
Object.defineProperty(exports, "__esModule", { value: true });
var tslib_1 = require("tslib");
require("reflect-metadata");
var chai_1 = require("chai");
var test_utils_1 = require("../../utils/test-utils");
var Category_1 = require("./entity/Category");
var Post_1 = require("./entity/Post");
var Image_1 = require("./entity/Image");
describe("github issues > #3946 loadRelationCountAndMap fails cause made a wrong IN calculation, when primary key is string", function () {
    var connections;
    before(function () { return tslib_1.__awaiter(_this, void 0, void 0, function () {
        return tslib_1.__generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, test_utils_1.createTestingConnections({
                        entities: [__dirname + "/entity/*{.js,.ts}"],
                    })];
                case 1: return [2 /*return*/, connections = _a.sent()];
            }
        });
    }); });
    beforeEach(function () { return test_utils_1.reloadTestingDatabases(connections); });
    after(function () { return test_utils_1.closeTestingConnections(connections); });
    it("should load relation count on owner side", function () { return Promise.all(connections.map(function (connection) { return tslib_1.__awaiter(_this, void 0, void 0, function () {
        var category1, category2, category3, category4, category5, post1, post2, loadedPosts, loadedPost;
        return tslib_1.__generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    category1 = new Category_1.Category();
                    category1.name = "cars";
                    return [4 /*yield*/, connection.manager.save(category1)];
                case 1:
                    _a.sent();
                    category2 = new Category_1.Category();
                    category2.name = "BMW";
                    return [4 /*yield*/, connection.manager.save(category2)];
                case 2:
                    _a.sent();
                    category3 = new Category_1.Category();
                    category3.name = "Germany";
                    return [4 /*yield*/, connection.manager.save(category3)];
                case 3:
                    _a.sent();
                    category4 = new Category_1.Category();
                    category4.name = "airplanes";
                    return [4 /*yield*/, connection.manager.save(category4)];
                case 4:
                    _a.sent();
                    category5 = new Category_1.Category();
                    category5.name = "Boeing";
                    return [4 /*yield*/, connection.manager.save(category5)];
                case 5:
                    _a.sent();
                    post1 = new Post_1.Post();
                    post1.id = "a26f5a9a-4017-4365-be65-4665081d3f39";
                    post1.title = "about BMW";
                    post1.categories = [category1, category2, category3];
                    return [4 /*yield*/, connection.manager.save(post1)];
                case 6:
                    _a.sent();
                    post2 = new Post_1.Post();
                    post2.id = "b1d58da3-913d-4696-afb5-a0d2aae41dc9";
                    post2.title = "about Boeing";
                    post2.categories = [category4, category5];
                    return [4 /*yield*/, connection.manager.save(post2)];
                case 7:
                    _a.sent();
                    return [4 /*yield*/, connection.manager
                            .createQueryBuilder(Post_1.Post, "post")
                            .loadRelationCountAndMap("post.categoryCount", "post.categories")
                            .getMany()];
                case 8:
                    loadedPosts = _a.sent();
                    chai_1.expect(loadedPosts[0].categoryCount).to.be.equal(3);
                    chai_1.expect(loadedPosts[1].categoryCount).to.be.equal(2);
                    return [4 /*yield*/, connection.manager
                            .createQueryBuilder(Post_1.Post, "post")
                            .loadRelationCountAndMap("post.categoryCount", "post.categories")
                            .where("post.id = :id", { id: post1.id })
                            .getOne()];
                case 9:
                    loadedPost = _a.sent();
                    chai_1.expect(loadedPost.categoryCount).to.be.equal(3);
                    return [2 /*return*/];
            }
        });
    }); })); });
    it("should load relation count on owner side with limitation", function () { return Promise.all(connections.map(function (connection) { return tslib_1.__awaiter(_this, void 0, void 0, function () {
        var category1, category2, category3, category4, category5, post1, post2, post3, post4, loadedPosts;
        return tslib_1.__generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    category1 = new Category_1.Category();
                    category1.id = "126f5a9a-4017-4365-be65-4665081d3f39";
                    category1.name = "cars";
                    return [4 /*yield*/, connection.manager.save(category1)];
                case 1:
                    _a.sent();
                    category2 = new Category_1.Category();
                    category2.id = "226f5a9a-4017-4365-be65-4665081d3f39";
                    category2.name = "BMW";
                    return [4 /*yield*/, connection.manager.save(category2)];
                case 2:
                    _a.sent();
                    category3 = new Category_1.Category();
                    category3.id = "326f5a9a-4017-4365-be65-4665081d3f39";
                    category3.name = "Germany";
                    return [4 /*yield*/, connection.manager.save(category3)];
                case 3:
                    _a.sent();
                    category4 = new Category_1.Category();
                    category4.id = "426f5a9a-4017-4365-be65-4665081d3f39";
                    category4.name = "airplanes";
                    return [4 /*yield*/, connection.manager.save(category4)];
                case 4:
                    _a.sent();
                    category5 = new Category_1.Category();
                    category5.id = "526f5a9a-4017-4365-be65-4665081d3f39";
                    category5.name = "Boeing";
                    return [4 /*yield*/, connection.manager.save(category5)];
                case 5:
                    _a.sent();
                    post1 = new Post_1.Post();
                    post1.id = "a26f5a9a-4017-4365-be65-4665081d3f39";
                    post1.title = "about BMW";
                    post1.categories = [category1, category2, category3];
                    return [4 /*yield*/, connection.manager.save(post1)];
                case 6:
                    _a.sent();
                    post2 = new Post_1.Post();
                    post2.id = "b1d58da3-913d-4696-afb5-a0d2aae41dc9";
                    post2.title = "about Boeing";
                    post2.categories = [category4, category5];
                    return [4 /*yield*/, connection.manager.save(post2)];
                case 7:
                    _a.sent();
                    post3 = new Post_1.Post();
                    post3.id = "c1d58da3-913d-4696-afb5-a0d2aae41dc9";
                    post3.title = "about Audi";
                    return [4 /*yield*/, connection.manager.save(post3)];
                case 8:
                    _a.sent();
                    post4 = new Post_1.Post();
                    post4.id = "d1d58da3-913d-4696-afb5-a0d2aae41dc9";
                    post4.title = "about Airbus";
                    return [4 /*yield*/, connection.manager.save(post4)];
                case 9:
                    _a.sent();
                    return [4 /*yield*/, connection.manager
                            .createQueryBuilder(Post_1.Post, "post")
                            .loadRelationCountAndMap("post.categoryCount", "post.categories")
                            .orderBy("post.id")
                            .offset(0)
                            .limit(2)
                            .getMany()];
                case 10:
                    loadedPosts = _a.sent();
                    chai_1.expect(loadedPosts[0].categoryCount).to.be.equal(3);
                    chai_1.expect(loadedPosts[1].categoryCount).to.be.equal(2);
                    return [2 /*return*/];
            }
        });
    }); })); });
    it("should load relation count on owner side with additional conditions", function () { return Promise.all(connections.map(function (connection) { return tslib_1.__awaiter(_this, void 0, void 0, function () {
        var image1, image2, image3, category1, category2, category3, category4, category5, post1, post2, loadedPosts, loadedPost;
        return tslib_1.__generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    image1 = new Image_1.Image();
                    image1.id = "11d58da3-913d-4696-afb5-a0d2aae41dc9";
                    image1.isRemoved = true;
                    image1.name = "image #1";
                    return [4 /*yield*/, connection.manager.save(image1)];
                case 1:
                    _a.sent();
                    image2 = new Image_1.Image();
                    image2.id = "21d58da3-913d-4696-afb5-a0d2aae41dc9";
                    image2.name = "image #2";
                    return [4 /*yield*/, connection.manager.save(image2)];
                case 2:
                    _a.sent();
                    image3 = new Image_1.Image();
                    image3.id = "31d58da3-913d-4696-afb5-a0d2aae41dc9";
                    image3.name = "image #3";
                    return [4 /*yield*/, connection.manager.save(image3)];
                case 3:
                    _a.sent();
                    category1 = new Category_1.Category();
                    category1.id = "41d58da3-913d-4696-afb5-a0d2aae41dc9";
                    category1.name = "cars";
                    category1.isRemoved = true;
                    category1.images = [image1, image2];
                    return [4 /*yield*/, connection.manager.save(category1)];
                case 4:
                    _a.sent();
                    category2 = new Category_1.Category();
                    category2.id = "51d58da3-913d-4696-afb5-a0d2aae41dc9";
                    category2.name = "BMW";
                    return [4 /*yield*/, connection.manager.save(category2)];
                case 5:
                    _a.sent();
                    category3 = new Category_1.Category();
                    category3.id = "61d58da3-913d-4696-afb5-a0d2aae41dc9";
                    category3.name = "Germany";
                    return [4 /*yield*/, connection.manager.save(category3)];
                case 6:
                    _a.sent();
                    category4 = new Category_1.Category();
                    category4.id = "71d58da3-913d-4696-afb5-a0d2aae41dc9";
                    category4.name = "airplanes";
                    category4.images = [image3];
                    return [4 /*yield*/, connection.manager.save(category4)];
                case 7:
                    _a.sent();
                    category5 = new Category_1.Category();
                    category5.id = "81d58da3-913d-4696-afb5-a0d2aae41dc9";
                    category5.name = "Boeing";
                    return [4 /*yield*/, connection.manager.save(category5)];
                case 8:
                    _a.sent();
                    post1 = new Post_1.Post();
                    post1.id = "a1d58da3-913d-4696-afb5-a0d2aae41dc9";
                    post1.title = "about BMW";
                    post1.categories = [category1, category2, category3];
                    return [4 /*yield*/, connection.manager.save(post1)];
                case 9:
                    _a.sent();
                    post2 = new Post_1.Post();
                    post2.id = "b1d58da3-913d-4696-afb5-a0d2aae41dc9";
                    post2.title = "about Boeing";
                    post2.categories = [category4, category5];
                    return [4 /*yield*/, connection.manager.save(post2)];
                case 10:
                    _a.sent();
                    return [4 /*yield*/, connection.manager
                            .createQueryBuilder(Post_1.Post, "post")
                            .leftJoinAndSelect("post.categories", "categories")
                            .loadRelationCountAndMap("post.categoryCount", "post.categories")
                            .loadRelationCountAndMap("post.removedCategoryCount", "post.categories", "rc", function (qb) { return qb.andWhere("rc.isRemoved = :isRemoved", { isRemoved: true }); })
                            .loadRelationCountAndMap("categories.imageCount", "categories.images", "ic")
                            .loadRelationCountAndMap("categories.removedImageCount", "categories.images", "removedImages", function (qb) { return qb.andWhere("removedImages.isRemoved = :isRemoved", { isRemoved: true }); })
                            .addOrderBy("post.id, categories.id")
                            .getMany()];
                case 11:
                    loadedPosts = _a.sent();
                    chai_1.expect(loadedPosts[0].categoryCount).to.be.equal(3);
                    chai_1.expect(loadedPosts[0].removedCategoryCount).to.be.equal(1);
                    chai_1.expect(loadedPosts[0].categories[0].imageCount).to.be.equal(2);
                    chai_1.expect(loadedPosts[0].categories[0].removedImageCount).to.be.equal(1);
                    chai_1.expect(loadedPosts[0].categories[1].imageCount).to.be.equal(0);
                    chai_1.expect(loadedPosts[0].categories[2].imageCount).to.be.equal(0);
                    chai_1.expect(loadedPosts[1].categoryCount).to.be.equal(2);
                    chai_1.expect(loadedPosts[1].categories[0].imageCount).to.be.equal(1);
                    return [4 /*yield*/, connection.manager
                            .createQueryBuilder(Post_1.Post, "post")
                            .leftJoinAndSelect("post.categories", "categories")
                            .loadRelationCountAndMap("post.categoryCount", "post.categories")
                            .loadRelationCountAndMap("post.removedCategoryCount", "post.categories", "rc", function (qb) { return qb.andWhere("rc.isRemoved = :isRemoved", { isRemoved: true }); })
                            .loadRelationCountAndMap("categories.imageCount", "categories.images", "ic")
                            .loadRelationCountAndMap("categories.removedImageCount", "categories.images", "removedImages", function (qb) { return qb.andWhere("removedImages.isRemoved = :isRemoved", { isRemoved: true }); })
                            .where("post.id = :id", { id: post1.id })
                            .addOrderBy("post.id, categories.id")
                            .getOne()];
                case 12:
                    loadedPost = _a.sent();
                    chai_1.expect(loadedPost.categoryCount).to.be.equal(3);
                    chai_1.expect(loadedPost.removedCategoryCount).to.be.equal(1);
                    chai_1.expect(loadedPost.categories[0].imageCount).to.be.equal(2);
                    chai_1.expect(loadedPost.categories[0].removedImageCount).to.be.equal(1);
                    return [2 /*return*/];
            }
        });
    }); })); });
    it("should load relation count on both sides of relation", function () { return Promise.all(connections.map(function (connection) { return tslib_1.__awaiter(_this, void 0, void 0, function () {
        var category1, category2, category3, post1, post2, loadedPosts, loadedPost;
        return tslib_1.__generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    category1 = new Category_1.Category();
                    category1.id = "41d58da3-913d-4696-afb5-a0d2aae41dc9";
                    category1.name = "cars";
                    return [4 /*yield*/, connection.manager.save(category1)];
                case 1:
                    _a.sent();
                    category2 = new Category_1.Category();
                    category2.id = "51d58da3-913d-4696-afb5-a0d2aae41dc9";
                    category2.name = "BMW";
                    return [4 /*yield*/, connection.manager.save(category2)];
                case 2:
                    _a.sent();
                    category3 = new Category_1.Category();
                    category3.id = "61d58da3-913d-4696-afb5-a0d2aae41dc9";
                    category3.name = "Germany";
                    return [4 /*yield*/, connection.manager.save(category3)];
                case 3:
                    _a.sent();
                    post1 = new Post_1.Post();
                    post1.id = "71d58da3-913d-4696-afb5-a0d2aae41dc9";
                    post1.title = "about BMW";
                    post1.categories = [category1, category2, category3];
                    return [4 /*yield*/, connection.manager.save(post1)];
                case 4:
                    _a.sent();
                    post2 = new Post_1.Post();
                    post2.id = "81d58da3-913d-4696-afb5-a0d2aae41dc9";
                    post2.title = "about Audi";
                    post2.categories = [category1, category3];
                    return [4 /*yield*/, connection.manager.save(post2)];
                case 5:
                    _a.sent();
                    return [4 /*yield*/, connection.manager
                            .createQueryBuilder(Post_1.Post, "post")
                            .leftJoinAndSelect("post.categories", "categories")
                            .loadRelationCountAndMap("post.categoryCount", "post.categories")
                            .loadRelationCountAndMap("categories.postCount", "categories.posts")
                            .addOrderBy("post.id, categories.id")
                            .getMany()];
                case 6:
                    loadedPosts = _a.sent();
                    chai_1.expect(loadedPosts[0].categoryCount).to.be.equal(3);
                    chai_1.expect(loadedPosts[0].categories[0].postCount).to.be.equal(2);
                    chai_1.expect(loadedPosts[0].categories[1].postCount).to.be.equal(1);
                    chai_1.expect(loadedPosts[0].categories[2].postCount).to.be.equal(2);
                    chai_1.expect(loadedPosts[1].categoryCount).to.be.equal(2);
                    chai_1.expect(loadedPosts[1].categories[0].postCount).to.be.equal(2);
                    chai_1.expect(loadedPosts[1].categories[1].postCount).to.be.equal(2);
                    return [4 /*yield*/, connection.manager
                            .createQueryBuilder(Post_1.Post, "post")
                            .leftJoinAndSelect("post.categories", "categories")
                            .loadRelationCountAndMap("post.categoryCount", "post.categories")
                            .loadRelationCountAndMap("categories.postCount", "categories.posts")
                            .where("post.id = :id", { id: post1.id })
                            .addOrderBy("post.id, categories.id")
                            .getOne()];
                case 7:
                    loadedPost = _a.sent();
                    chai_1.expect(loadedPost.categoryCount).to.be.equal(3);
                    chai_1.expect(loadedPost.categories[0].postCount).to.be.equal(2);
                    chai_1.expect(loadedPost.categories[1].postCount).to.be.equal(1);
                    chai_1.expect(loadedPost.categories[2].postCount).to.be.equal(2);
                    return [2 /*return*/];
            }
        });
    }); })); });
    it("should load relation count on inverse side", function () { return Promise.all(connections.map(function (connection) { return tslib_1.__awaiter(_this, void 0, void 0, function () {
        var category1, category2, post1, post2, post3, post4, post5, loadedCategories, loadedCategory;
        return tslib_1.__generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    category1 = new Category_1.Category();
                    category1.id = "41d58da3-913d-4696-afb5-a0d2aae41dc9";
                    category1.name = "cars";
                    return [4 /*yield*/, connection.manager.save(category1)];
                case 1:
                    _a.sent();
                    category2 = new Category_1.Category();
                    category2.id = "51d58da3-913d-4696-afb5-a0d2aae41dc9";
                    category2.name = "airplanes";
                    return [4 /*yield*/, connection.manager.save(category2)];
                case 2:
                    _a.sent();
                    post1 = new Post_1.Post();
                    post1.id = "61d58da3-913d-4696-afb5-a0d2aae41dc9";
                    post1.title = "about BMW";
                    post1.categories = [category1];
                    return [4 /*yield*/, connection.manager.save(post1)];
                case 3:
                    _a.sent();
                    post2 = new Post_1.Post();
                    post1.id = "71d58da3-913d-4696-afb5-a0d2aae41dc9";
                    post2.title = "about Audi";
                    post2.categories = [category1];
                    return [4 /*yield*/, connection.manager.save(post2)];
                case 4:
                    _a.sent();
                    post3 = new Post_1.Post();
                    post1.id = "81d58da3-913d-4696-afb5-a0d2aae41dc9";
                    post3.title = "about Mercedes";
                    post3.categories = [category1];
                    return [4 /*yield*/, connection.manager.save(post3)];
                case 5:
                    _a.sent();
                    post4 = new Post_1.Post();
                    post1.id = "91d58da3-913d-4696-afb5-a0d2aae41dc9";
                    post4.title = "about Boeing";
                    post4.categories = [category2];
                    return [4 /*yield*/, connection.manager.save(post4)];
                case 6:
                    _a.sent();
                    post5 = new Post_1.Post();
                    post1.id = "a1d58da3-913d-4696-afb5-a0d2aae41dc9";
                    post5.title = "about Airbus";
                    post5.categories = [category2];
                    return [4 /*yield*/, connection.manager.save(post5)];
                case 7:
                    _a.sent();
                    return [4 /*yield*/, connection.manager
                            .createQueryBuilder(Category_1.Category, "category")
                            .loadRelationCountAndMap("category.postCount", "category.posts")
                            .getMany()];
                case 8:
                    loadedCategories = _a.sent();
                    chai_1.expect(loadedCategories[0].postCount).to.be.equal(3);
                    chai_1.expect(loadedCategories[1].postCount).to.be.equal(2);
                    return [4 /*yield*/, connection.manager
                            .createQueryBuilder(Category_1.Category, "category")
                            .loadRelationCountAndMap("category.postCount", "category.posts")
                            .where("category.id = :id", { id: category1.id })
                            .getOne()];
                case 9:
                    loadedCategory = _a.sent();
                    chai_1.expect(loadedCategory.postCount).to.be.equal(3);
                    return [2 /*return*/];
            }
        });
    }); })); });
    it("should load relation count on inverse side with limitation", function () { return Promise.all(connections.map(function (connection) { return tslib_1.__awaiter(_this, void 0, void 0, function () {
        var category1, category2, category3, category4, post1, post2, post3, post4, post5, loadedCategories;
        return tslib_1.__generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    category1 = new Category_1.Category();
                    category1.id = "11d58da3-913d-4696-afb5-a0d2aae41dc9";
                    category1.name = "cars";
                    return [4 /*yield*/, connection.manager.save(category1)];
                case 1:
                    _a.sent();
                    category2 = new Category_1.Category();
                    category2.id = "21d58da3-913d-4696-afb5-a0d2aae41dc9";
                    category2.name = "airplanes";
                    return [4 /*yield*/, connection.manager.save(category2)];
                case 2:
                    _a.sent();
                    category3 = new Category_1.Category();
                    category3.id = "31d58da3-913d-4696-afb5-a0d2aae41dc9";
                    category3.name = "BMW";
                    return [4 /*yield*/, connection.manager.save(category3)];
                case 3:
                    _a.sent();
                    category4 = new Category_1.Category();
                    category4.id = "41d58da3-913d-4696-afb5-a0d2aae41dc9";
                    category4.name = "Boeing";
                    return [4 /*yield*/, connection.manager.save(category4)];
                case 4:
                    _a.sent();
                    post1 = new Post_1.Post();
                    post1.id = "51d58da3-913d-4696-afb5-a0d2aae41dc9";
                    post1.title = "about BMW";
                    post1.categories = [category1];
                    return [4 /*yield*/, connection.manager.save(post1)];
                case 5:
                    _a.sent();
                    post2 = new Post_1.Post();
                    post2.id = "61d58da3-913d-4696-afb5-a0d2aae41dc9";
                    post2.title = "about Audi";
                    post2.categories = [category1];
                    return [4 /*yield*/, connection.manager.save(post2)];
                case 6:
                    _a.sent();
                    post3 = new Post_1.Post();
                    post3.id = "71d58da3-913d-4696-afb5-a0d2aae41dc9";
                    post3.title = "about Mercedes";
                    post3.categories = [category1];
                    return [4 /*yield*/, connection.manager.save(post3)];
                case 7:
                    _a.sent();
                    post4 = new Post_1.Post();
                    post4.id = "81d58da3-913d-4696-afb5-a0d2aae41dc9";
                    post4.title = "about Boeing";
                    post4.categories = [category2];
                    return [4 /*yield*/, connection.manager.save(post4)];
                case 8:
                    _a.sent();
                    post5 = new Post_1.Post();
                    post5.id = "91d58da3-913d-4696-afb5-a0d2aae41dc9";
                    post5.title = "about Airbus";
                    post5.categories = [category2];
                    return [4 /*yield*/, connection.manager.save(post5)];
                case 9:
                    _a.sent();
                    return [4 /*yield*/, connection.manager
                            .createQueryBuilder(Category_1.Category, "category")
                            .loadRelationCountAndMap("category.postCount", "category.posts")
                            .orderBy("category.id")
                            .offset(0)
                            .limit(2)
                            .getMany()];
                case 10:
                    loadedCategories = _a.sent();
                    chai_1.expect(loadedCategories[0].postCount).to.be.equal(3);
                    chai_1.expect(loadedCategories[1].postCount).to.be.equal(2);
                    return [2 /*return*/];
            }
        });
    }); })); });
    it("should load relation count on inverse side with additional conditions", function () { return Promise.all(connections.map(function (connection) { return tslib_1.__awaiter(_this, void 0, void 0, function () {
        var category1, category2, post1, post2, post3, post4, post5, loadedCategories, loadedCategory;
        return tslib_1.__generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    category1 = new Category_1.Category();
                    category1.id = "11d58da3-913d-4696-afb5-a0d2aae41dc9";
                    category1.name = "cars";
                    return [4 /*yield*/, connection.manager.save(category1)];
                case 1:
                    _a.sent();
                    category2 = new Category_1.Category();
                    category2.id = "21d58da3-913d-4696-afb5-a0d2aae41dc9";
                    category2.name = "airplanes";
                    return [4 /*yield*/, connection.manager.save(category2)];
                case 2:
                    _a.sent();
                    post1 = new Post_1.Post();
                    post1.id = "31d58da3-913d-4696-afb5-a0d2aae41dc9";
                    post1.title = "about BMW";
                    post1.isRemoved = true;
                    post1.categories = [category1];
                    return [4 /*yield*/, connection.manager.save(post1)];
                case 3:
                    _a.sent();
                    post2 = new Post_1.Post();
                    post2.id = "41d58da3-913d-4696-afb5-a0d2aae41dc9";
                    post2.title = "about Audi";
                    post2.isRemoved = true;
                    post2.categories = [category1];
                    return [4 /*yield*/, connection.manager.save(post2)];
                case 4:
                    _a.sent();
                    post3 = new Post_1.Post();
                    post3.id = "51d58da3-913d-4696-afb5-a0d2aae41dc9";
                    post3.title = "about Mercedes";
                    post3.categories = [category1];
                    return [4 /*yield*/, connection.manager.save(post3)];
                case 5:
                    _a.sent();
                    post4 = new Post_1.Post();
                    post4.id = "61d58da3-913d-4696-afb5-a0d2aae41dc9";
                    post4.title = "about Boeing";
                    post4.categories = [category2];
                    return [4 /*yield*/, connection.manager.save(post4)];
                case 6:
                    _a.sent();
                    post5 = new Post_1.Post();
                    post5.id = "71d58da3-913d-4696-afb5-a0d2aae41dc9";
                    post5.title = "about Airbus";
                    post5.categories = [category2];
                    return [4 /*yield*/, connection.manager.save(post5)];
                case 7:
                    _a.sent();
                    return [4 /*yield*/, connection.manager
                            .createQueryBuilder(Category_1.Category, "category")
                            .loadRelationCountAndMap("category.postCount", "category.posts")
                            .loadRelationCountAndMap("category.removedPostCount", "category.posts", "removedPosts", function (qb) { return qb.andWhere("removedPosts.isRemoved = :isRemoved", { isRemoved: true }); })
                            .getMany()];
                case 8:
                    loadedCategories = _a.sent();
                    chai_1.expect(loadedCategories[0].postCount).to.be.equal(3);
                    chai_1.expect(loadedCategories[0].removedPostCount).to.be.equal(2);
                    chai_1.expect(loadedCategories[1].postCount).to.be.equal(2);
                    return [4 /*yield*/, connection.manager
                            .createQueryBuilder(Category_1.Category, "category")
                            .loadRelationCountAndMap("category.postCount", "category.posts")
                            .loadRelationCountAndMap("category.removedPostCount", "category.posts", "removedPosts", function (qb) { return qb.andWhere("removedPosts.isRemoved = :isRemoved", { isRemoved: true }); })
                            .where("category.id = :id", { id: category1.id })
                            .getOne()];
                case 9:
                    loadedCategory = _a.sent();
                    chai_1.expect(loadedCategory.postCount).to.be.equal(3);
                    chai_1.expect(loadedCategory.removedPostCount).to.be.equal(2);
                    return [2 /*return*/];
            }
        });
    }); })); });
});
//# sourceMappingURL=issue-3946.js.map