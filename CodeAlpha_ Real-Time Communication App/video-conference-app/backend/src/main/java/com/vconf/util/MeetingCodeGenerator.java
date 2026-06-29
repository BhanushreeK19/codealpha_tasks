package com.vconf.util;

import java.security.SecureRandom;

/**
 * Generates human-friendly join codes in the form "xxx-xxxx-xxx",
 * similar to Google Meet links, using a lowercase alphabet that
 * excludes visually-confusing characters (0/o, 1/l/i).
 */
public final class MeetingCodeGenerator {

    private static final String ALPHABET = "abcdefghjkmnpqrstuvwxyz23456789";
    private static final SecureRandom RANDOM = new SecureRandom();

    private MeetingCodeGenerator() {
    }

    public static String generate() {
        return segment(3) + "-" + segment(4) + "-" + segment(3);
    }

    private static String segment(int length) {
        StringBuilder sb = new StringBuilder(length);
        for (int i = 0; i < length; i++) {
            sb.append(ALPHABET.charAt(RANDOM.nextInt(ALPHABET.length())));
        }
        return sb.toString();
    }
}
