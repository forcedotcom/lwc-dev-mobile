import * as common from '../Common';

describe('Commons utils tests', () => {
    test('Filtering of maps returns maps', async () => {
        let mascotMapping = new Map();
        mascotMapping.set('Edddie', 'Iron Maiden');
        mascotMapping.set('Rattlehead', 'Megadeth');
        mascotMapping.set('Henry', 'Sabbath');

        let filteredByMascots = common.MapUtils.filter(
            mascotMapping,
            (key, value) => key.indexOf('Rattle') > -1
        );
        return expect(filteredByMascots.size == 1);
    });

    test('Filtering of maps returns empty maps', async () => {
        let mascotMapping = new Map();
        mascotMapping.set('Edddie', 'Iron Maiden');
        mascotMapping.set('Rattlehead', 'Megadeth');
        mascotMapping.set('Henry', 'Sabbath');

        let filteredByMascots = common.MapUtils.filter(
            mascotMapping,
            (key, value) => key.indexOf('Murray') > -1
        );
        return expect(filteredByMascots.size == 0);
    });

    test('Filtering of maps retrun empty maps and not null, when no match is found', async () => {
        let mascotMapping = new Map();
        mascotMapping.set('Edddie', 'Iron Maiden');
        mascotMapping.set('Rattlehead', 'Megadeth');
        mascotMapping.set('Henry', 'Sabbath');

        let filteredByMascots = common.MapUtils.filter(
            mascotMapping,
            (key, value) => key.indexOf('Murray') > -1
        );
        return expect(
            filteredByMascots != undefined && filteredByMascots != null
        );
    });

    test('Filtering of empty maps returns empty maps, when no match is found', async () => {
        let mascotMapping = new Map<String, String>();
        let filteredByMascots = common.MapUtils.filter(
            mascotMapping,
            (key, value) => key.indexOf('Murray') > -1
        );
        return expect(
            filteredByMascots != undefined && filteredByMascots != null
        );
    });

    test('Filtering of sets returns sets', async () => {
        let mascotSets = new Set<String>();
        mascotSets.add('Edddie');
        mascotSets.add('Rattlehead');
        mascotSets.add('Henry');

        let filteredByMascots = common.SetUtils.filter(
            mascotSets,
            value => value.indexOf('Rattle') > -1
        );
        return expect(filteredByMascots.size == 1);
    });

    test('Filtering of sets returns empty sets when no match is found', async () => {
        let mascotSets = new Set<String>();
        mascotSets.add('Edddie');
        mascotSets.add('Rattlehead');
        mascotSets.add('Henry');

        let filteredByMascots = common.SetUtils.filter(
            mascotSets,
            value => value.indexOf('Murray') > -1
        );
        return expect(filteredByMascots.size == 0);
    });

    test('Filtering of sets returns empty set and not null, when no match is found', async () => {
        let mascotSets = new Set<String>();
        mascotSets.add('Edddie');
        mascotSets.add('Rattlehead');
        mascotSets.add('Henry');

        let filteredByMascots = common.SetUtils.filter(
            mascotSets,
            value => value.indexOf('Murray') > -1
        );
        return expect(
            filteredByMascots != undefined && filteredByMascots != null
        );
    });

    test('Test if Android platform check matches input string', async () => {
        return expect(
            common.CommandLineUtils.platformFlagIsAndroid('android') == true
        );
    });

    test('Test if Android platform check matches input string', async () => {
        return expect(
            common.CommandLineUtils.platformFlagIsAndroid('AndroiD') == true
        );
    });

    test('Test that Android platform check does not match input string', async () => {
        return expect(
            common.CommandLineUtils.platformFlagIsAndroid('lkds') == false
        );
    });

    test('Test that Android platform check does not match empty input string', async () => {
        return expect(
            common.CommandLineUtils.platformFlagIsAndroid('') == false
        );
    });

    test('Test if iOS platform matches input string', async () => {
        return expect(common.CommandLineUtils.platformFlagIsIOS('iOS') == true);
    });

    test('Test if iOS platform matches input string', async () => {
        return expect(common.CommandLineUtils.platformFlagIsIOS('IOS') == true);
    });

    test('Test that iOS platform check does not match input string', async () => {
        return expect(
            common.CommandLineUtils.platformFlagIsIOS('lkds') == false
        );
    });

    test('Test that iOS platform check does not match empty input string', async () => {
        return expect(common.CommandLineUtils.platformFlagIsIOS('') == false);
    });
});
