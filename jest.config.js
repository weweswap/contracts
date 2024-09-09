module.exports = {
	preset: "ts-jest",
	testEnvironment: "node",
	testTimeout: 50000,
	moduleFileExtensions: ["ts", "js", "json", "node"],
	transform: {
		"^.+\\.ts$": "ts-jest"
	},
	testMatch: ["**/test/**/*.test.ts"]
};
