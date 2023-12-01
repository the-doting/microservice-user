import { ServiceSchema } from "../../../lib/types";

import DBMixin from "moleculer-db";
import SqlAdapter from "moleculer-db-adapter-sequelize";
import Sequelize from "sequelize";

import _ from "lodash";

(DBMixin as any).actions = {};

const Service: ServiceSchema = {
	name: "user",
	version: "api.v1",

	/**
	 * Mixins
	 */
	mixins: [DBMixin],

	adapter: new SqlAdapter(process.env.DATABASE_URL || "sqlite://:memory:"),

	model: {
		name: "user",
		define: {
			firstname: {
				type: Sequelize.STRING,
				default: null,
			},
			lastname: {
				type: Sequelize.STRING,
				default: null,
			},
			nickname: {
				type: Sequelize.STRING,
				default: null,
			},
			fullname: {
				type: Sequelize.STRING,
				default: null,
			},
			email: {
				type: Sequelize.STRING,
				default: null,
			},
			emailVerified: {
				type: Sequelize.BOOLEAN,
				default: false,
			},
			phone: {
				type: Sequelize.STRING,
				default: null,
			},
			phoneVerified: {
				type: Sequelize.BOOLEAN,
				default: false,
			},
			phoneCountryCode: {
				type: Sequelize.STRING,
				default: null,
			},
			username: {
				type: Sequelize.STRING,
				default: null,
			},
			gender: {
				type: Sequelize.STRING,
				default: "UNKNOWN",
			},
			birthdate: {
				type: Sequelize.DATE,
				default: null,
			},
			idCard: {
				type: Sequelize.STRING,
				default: null,
			},
			createdBy: {
				type: Sequelize.STRING,
			},
			deleted: {
				type: Sequelize.BOOLEAN,
				default: false,
			},
			deletedAt: {
				type: Sequelize.DATE,
				default: null,
			},
			ready: {
				type: Sequelize.BOOLEAN,
				default: false,
			},
			readyAt: {
				type: Sequelize.DATE,
				default: null,
			},
			banned: {
				type: Sequelize.BOOLEAN,
				default: false,
			},
			bannedAt: {
				type: Sequelize.DATE,
			},
			bannedReason: {
				type: Sequelize.STRING,
				default: null,
			},
			bannedBy: {
				type: Sequelize.INTEGER, // user id
				default: null,
			},
			uniqueBy: {
				type: Sequelize.STRING, // email, phone, username
			},
		},
	},

	/**
	 * Service settings
	 */
	settings: {},

	/**
	 * Service dependencies
	 */
	// dependencies: [],

	/**
	 * Actions
	 */
	actions: {
		// CRUD actions
		create: {
			rest: "POST /",
			params: {
				firstname: { type: "string", max: 255, optional: true },
				lastname: { type: "string", max: 255, optional: true },
				fullname: { type: "string", max: 255, optional: true },
				email: { type: "email", max: 255, optional: true },
				emailVerified: { type: "boolean", optional: true },
				phone: { type: "string", max: 255, optional: true },
				phoneCountryCode: {
					type: "string",
					max: 4,
					optional: true,
					// starts with + and 1 or 2 or 3 digits
					pattern: /^\+\d{1,3}$/,
				},
				phoneVerified: { type: "boolean", optional: true },
				username: { type: "string", max: 255, optional: true },
				unique: { type: "enum", values: ["email", "phone", "username"] },
			},
			async handler(ctx) {
				try {
					const createdBy = ctx.meta.creator.trim().toLowerCase();

					// if phone exists, check phoneCountryCode
					if (ctx.params.unique == "phone") {
						if (!ctx.params.phoneCountryCode) {
							return {
								code: 422,
								i18n: "NEED_PHONE_COUNTRY_CODE",
								data: [
									{
										field: "phoneCountryCode",
										type: "string",
										max: 4,
										pattern: "/^+d{1,3}$/",
										message: "The 'phoneCountryCode' field is required.",
									},
								],
							};
						}
					}

					// check unique exists or not in db
					const [result] = await this.adapter.db.query(
						`SELECT * FROM users WHERE ${ctx.params.unique} = '${
							ctx.params[ctx.params.unique]
						}'`
					);

					if (result.length > 0) {
						return {
							code: 400,
							i18n: "UNIQUE_ALREADY_EXISTS",
							data: {
								..._.pick(result[0], ["id", "email", "phone", "username"]),
							},
						};
					}

					// create user
					const output = await this.adapter.insert({
						...ctx.params,
						createdBy,
						uniqueBy: ctx.params.unique,
						deleted: false,
						ready: false,
						banned: false,
					});

					const [[user]] = await this.adapter.db.query(
						`SELECT * FROM users WHERE id = '${output.id}'`
					);

					// return user
					return {
						code: 200,
						i18n: "USER_CREATED",
						data: {
							...user,
							emailVerified: user.emailVerified === 1,
							phoneVerified: user.phoneVerified === 1,
							deleted: false,
							ready: false,
							banned: false,
						},
					};
				} catch (error) {
					console.error(error);

					return {
						code: 500,
					};
				}
			},
		},
		update: {
			rest: "PATCH /:id",
			params: {
				id: {
					type: "number",
					convert: true,
					min: 1,
					integer: true,
					positive: true,
				},
				firstname: { type: "string", max: 255, optional: true },
				lastname: { type: "string", max: 255, optional: true },
				nickname: { type: "string", max: 255, optional: true },
				fullname: { type: "string", max: 255, optional: true },
				email: { type: "email", max: 255, optional: true },
				emailVerified: { type: "boolean", optional: true },
				phone: { type: "string", max: 255, optional: true },
				phoneVerified: { type: "boolean", optional: true },
				phoneCountryCode: {
					type: "string",
					max: 4,
					optional: true,
					// starts with + and 1 or 2 or 3 digits
					pattern: /^\+\d{1,3}$/,
				},
				username: { type: "string", max: 255, optional: true },
				gender: {
					type: "enum",
					values: ["UNKNOWN", "MALE", "FEMALE", "RATHER_NOT_TO_SAY"],
					optional: true,
				},
				birthdate: { type: "date", optional: true },
				idCard: { type: "string", optional: true },
				deleted: { type: "boolean", optional: true },
				ready: { type: "boolean", optional: true },
				banned: { type: "boolean", optional: true },
				bannedReason: { type: "string", optional: true },
				bannedBy: {
					type: "number",
					integer: true,
					positive: true,
					optional: true,
				},
			},
			async handler(ctx) {
				try {
					// 1. find user by id
					const [user] = await this.adapter.db.query(
						`SELECT * FROM users WHERE id = '${ctx.params.id}'`
					);

					// 2. if user not found, throw error
					if (!user || user.length === 0) {
						return {
							code: 404,
							i18n: "USER_NOT_FOUND",
						};
					}

					// 3. check unique changed
					if (
						ctx.params[user[0].uniqueBy] &&
						ctx.params[user[0].uniqueBy] !== user[0][user[0].uniqueBy]
					) {
						return {
							code: 400,
							i18n: "UNIQUE_CANNOT_BE_CHANGED",
							data: {
								unique: user[0].uniqueBy,
								value: user[0][user[0].uniqueBy],
								current: ctx.params[user[0].uniqueBy],
							},
						};
					}

					// 4. update user with sql
					let sql = `UPDATE users SET `;

					// if createdBy exists in params, delete it
					if (ctx.params.createdBy) {
						delete ctx.params.createdBy;
					}

					_.forEach(ctx.params, (value, key) => {
						if (key !== "id") {
							let newValue = value;

							// if typeof value is boolean use 0 or 1
							if (typeof value === "boolean") {
								newValue = value ? 1 : 0;
							}

							sql += `${key} = '${newValue}', `;
						}
					});

					["deleted", "ready", "banned"].forEach((key) => {
						if (ctx.params[key] === true) {
							sql += `${key}At = datetime('now'), `;
						} else if (ctx.params[key] === false) {
							sql += `${key}At = NULL, `;

							if (key === "banned") {
								sql += `bannedReason = NULL, `;
							}
						}
					});

					sql = sql.slice(0, -2);

					sql += ` WHERE id = '${ctx.params.id}'`;

					await this.adapter.db.query(sql);

					// 5. return user
					const [[updatedUser]] = await this.adapter.db.query(
						`SELECT * FROM users WHERE id = '${ctx.params.id}'`
					);

					return {
						code: 200,
						i18n: "USER_UPDATED",
						data: {
							...updatedUser,
							emailVerified: updatedUser.emailVerified === 1,
							phoneVerified: updatedUser.phoneVerified === 1,
							deleted: updatedUser.deleted === 1,
							ready: updatedUser.ready === 1,
							banned: updatedUser.banned === 1,
						},
					};
				} catch (error) {
					console.error(error);
					return {
						code: 500,
					};
				}
			},
		},
		deleteById: {
			rest: "DELETE /delete/:id",
			params: {
				id: { type: "number", integer: true, positive: true, convert: true },
				force: { type: "boolean", optional: true, default: false },
			},
			async handler(ctx) {
				try {
					const { id, force } = ctx.params;
					const createdBy = ctx.meta.creator.trim().toLowerCase();

					if (force) {
						await this.adapter.db.query(
							`DELETE FROM users WHERE id = '${id}' AND createdBy = '${createdBy}'`
						);
					} else {
						await this.adapter.db.query(
							`UPDATE users SET deleted = '1' AND deletedAt = NOW() WHERE id = '${id}' AND createdBy = '${createdBy}'`
						);
					}

					return {
						code: 200,
						i18n: "USER_DELETED",
					};
				} catch (error) {
					return {
						code: 500,
					};
				}
			},
		},
		// getById
		getById: {
			rest: "GET /get/:id",
			params: {
				id: { type: "number", integer: true, positive: true, convert: true },
			},
			async handler(ctx) {
				try {
					const createdBy = ctx.meta.creator.trim().toLowerCase();
					// 1. find user by id
					const [user] = await this.adapter.db.query(
						`SELECT * FROM users WHERE id = '${ctx.params.id}' AND createdBy = '${createdBy}'`
					);

					// 2. if user not found, throw error
					if (!user || user.length === 0) {
						return {
							code: 404,
							i18n: "USER_NOT_FOUND",
						};
					}

					// 3. return user
					return {
						code: 200,
						i18n: "USER_FOUND",
						data: {
							...user[0],
							emailVerified: user[0].emailVerified === 1,
							phoneVerified: user[0].phoneVerified === 1,
							deleted: user[0].deleted === 1,
							ready: user[0].ready === 1,
							banned: user[0].banned === 1,
						},
					};
				} catch (error) {
					return {
						code: 500,
						i18n: "#INTERNAL_SERVER_ERROR",
					};
				}
			},
		},
		// getByUnique
		getByUnique: {
			rest: "POST /get",
			params: {
				unique: { type: "enum", values: ["email", "phone", "username"] },
				value: { type: "string" },
			},
			async handler(ctx) {
				try {
					const createdBy = ctx.meta.creator.trim().toLowerCase();
					// 1. find user by unique
					const [user] = await this.adapter.db.query(
						`SELECT * FROM users WHERE ${ctx.params.unique} = '${ctx.params.value}' AND createdBy = '${createdBy}' AND uniqueBy = '${ctx.params.unique}'`
					);

					// 2. if user not found, throw error
					if (!user || user.length === 0) {
						return {
							code: 404,
							i18n: "USER_NOT_FOUND",
						};
					}

					// 3. return user
					return {
						code: 200,
						i18n: "USER_FOUND",
						data: {
							...user[0],
							emailVerified: user[0].emailVerified === 1,
							phoneVerified: user[0].phoneVerified === 1,
							deleted: user[0].deleted === 1,
							ready: user[0].ready === 1,
							banned: user[0].banned === 1,
						},
					};
				} catch (error) {
					return {
						code: 500,
						i18n: "#INTERNAL_SERVER_ERROR",
					};
				}
			},
		},
		// search
		search: {
			rest: "POST /search",
			params: {
				query: { type: "string", optional: true },
				page: {
					type: "number",
					integer: true,
					positive: true,
					convert: true,
					default: 1,
				},
				limit: {
					type: "number",
					integer: true,
					positive: true,
					convert: true,
					default: 10,
					min: 1,
					max: 100,
				},
			},
			async handler(ctx) {
				try {
					const createdBy = ctx.meta.creator.trim().toLowerCase();

					const fieldsToLike = [
						"firstname",
						"lastname",
						"nickname",
						"fullname",
						"email",
						"phone",
						"username",
						"idCard",
					];

					// 1. find user by query
					let sql = `SELECT * FROM users WHERE createdBy = '${createdBy}' AND (`;

					if (ctx.params.query && ctx.params.query !== "") {
						_.forEach(fieldsToLike, (field) => {
							sql += `${field} LIKE '%${ctx.params.query}%' OR `;
						});

						sql = sql.slice(0, -4);
						sql += `)`;
					} else {
						sql = sql.slice(0, -5);
					}

					sql += ` LIMIT ${ctx.params.limit} OFFSET ${
						(ctx.params.page - 1) * ctx.params.limit
					}`;

					const [users] = await this.adapter.db.query(sql);

					// 2. return user
					return {
						code: 200,
						i18n: "USER_FOUND",
						meta: {
							page: ctx.params.page,
							limit: ctx.params.limit,
							total: users.length,
							last: Math.ceil(users.length / ctx.params.limit),
						},
						data: users.map((user: any) => ({
							...user,
							emailVerified: user.emailVerified === 1,
							phoneVerified: user.phoneVerified === 1,
							deleted: user.deleted === 1,
							ready: user.ready === 1,
							banned: user.banned === 1,
						})),
					};
				} catch (error) {
					return {
						code: 500,
						i18n: "#INTERNAL_SERVER_ERROR",
					};
				}
			},
		},
	},

	/**
	 * Events
	 */
	events: {},

	/**
	 * Methods
	 */
	methods: {},

	/**
	 * Service created lifecycle event handler
	 */
	// created() {},

	/**
	 * Service started lifecycle event handler
	 */
	// started() { },

	/**
	 * Service stopped lifecycle event handler
	 */
	// stopped() { }
};

export = Service;
