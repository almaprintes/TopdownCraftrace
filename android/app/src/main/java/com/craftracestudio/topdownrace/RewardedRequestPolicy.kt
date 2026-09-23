package com.craftracestudio.topdownrace

internal object RewardedRequestPolicy {
    private val claimPrefixes = mapOf(
        "post_race_double_loot" to "post-race-x2:",
        "race_control_publish_record" to "race-control-publish:",
        "race_control_ghost_download" to "race-control-ghost:",
        "recycler_exchange_2" to "recycler-exchange:",
        "recycler_exchange_3" to "recycler-exchange:",
        "store_coins_100_4h" to "store-coins-100:",
    )

    data class Validation(val accepted: Boolean, val reason: String? = null)

    fun validate(placement: String?, claimId: String?): Validation {
        val cleanPlacement = placement.orEmpty().trim()
        val cleanClaim = claimId.orEmpty().trim()
        val prefix = claimPrefixes[cleanPlacement]
            ?: return Validation(false, "unsupported_placement")
        if (cleanClaim.isEmpty() || cleanClaim.length > 160 || !cleanClaim.startsWith(prefix)) {
            return Validation(false, "invalid_claim")
        }
        if (cleanClaim.any { it.code < 0x20 || it.code == 0x7f }) {
            return Validation(false, "invalid_claim")
        }
        if (cleanPlacement == "recycler_exchange_2" && !cleanClaim.endsWith(":2")) {
            return Validation(false, "invalid_claim")
        }
        if (cleanPlacement == "recycler_exchange_3" && !cleanClaim.endsWith(":3")) {
            return Validation(false, "invalid_claim")
        }
        return Validation(true)
    }

    fun placements(): Set<String> = claimPrefixes.keys
}
