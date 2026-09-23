package com.craftracestudio.topdownrace

import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class RewardedRequestPolicyTest {
    @Test
    fun acceptsAllSixPlacementClaimPairs() {
        val accepted = listOf(
            "post_race_double_loot" to "post-race-x2:track02:claim",
            "race_control_publish_record" to "race-control-publish:circuito-atlantico:12345",
            "race_control_ghost_download" to "race-control-ghost:record-ref",
            "recycler_exchange_2" to "recycler-exchange:2026-09-23:2",
            "recycler_exchange_3" to "recycler-exchange:2026-09-23:3",
            "store_coins_100_4h" to "store-coins-100:first",
        )

        accepted.forEach { (placement, claim) ->
            assertTrue("$placement should be accepted", RewardedRequestPolicy.validate(placement, claim).accepted)
        }
    }

    @Test
    fun rejectsUnknownPlacementMismatchedClaimAndRecyclerOrdinal() {
        assertFalse(RewardedRequestPolicy.validate("unknown", "post-race-x2:a:b").accepted)
        assertFalse(RewardedRequestPolicy.validate("post_race_double_loot", "store-coins-100:first").accepted)
        assertFalse(RewardedRequestPolicy.validate("recycler_exchange_2", "recycler-exchange:2026-09-23:3").accepted)
        assertFalse(RewardedRequestPolicy.validate("recycler_exchange_3", "recycler-exchange:2026-09-23:2").accepted)
    }
}
