/// <reference types="@types/dom-chromium-ai" />

import { err, ok, type Result, ResultAsync } from "neverthrow";
import { match } from "ts-pattern";

export function okOrThrow<T, E>(result: Result<T, E>): T {
	return result.match(
		(ok) => ok,
		(err) => {
			throw err;
		},
	);
}

export function checkAvailability(
	availabilityFn: () => Promise<Availability>,
	apiName: string,
): ResultAsync<void, Error> {
	return new ResultAsync(
		(async () => {
			try {
				const availability = await availabilityFn();
				return match(availability)
					.with("unavailable", () =>
						err(
							new Error(
								`${apiName} API is present but the model is unavailable on this device.`,
							),
						),
					)
					.with("downloadable", "downloading", "available", () => ok(undefined))
					.exhaustive();
			} catch (error) {
				return err(
					error instanceof Error
						? error
						: new Error(
								`Failed to check ${apiName} availability: ${String(error)}`,
							),
				);
			}
		})(),
	);
}
