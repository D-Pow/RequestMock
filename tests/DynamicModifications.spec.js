import MockRequests from '../src';

global.setTimeout = jest.fn((func, time) => func());

const mockUrl1 = 'https://example.com/someApi/1';
const mockUrl2 = 'https://example.com/someApi/2';
const mockUrl3 = 'some.other/API';

const dynamicConfig1 = {
    [mockUrl1]: {
        response: {
            data: ['a', 'b', 'c', 'd', 'e'],
            value: 7
        },
        dynamicResponseModFn: (request, response) => {
            response.data = response.data.concat(request.addLettersArray);
            response.value += request.valueModification;

            return response;
        }
    }
};
const dynamicConfig2 = {
    [mockUrl2]: {
        response: {
            aggregateObjects: [
                { id: 1, value: 'Some value' }
            ]
        },
        dynamicResponseModFn: (request, response) => {
            if (request.removeId) {
                const indexToRemove = response.aggregateObjects.findIndex(object => object.id === request.removeId);
                response.aggregateObjects.splice(indexToRemove, 1);
            }

            if (request.addObject) {
                response.aggregateObjects.push(request.addObject);
            }

            return response;
        }
    }
};
const dynamicConfigWithDelay = {
    [mockUrl1]: {
        response: { data: 'some mock response' },
        dynamicResponseModFn: (request, response) => {
            response.data = 'new mock response';
            return response;
        },
        delay: 1000
    }
};

describe('Dynamic response modifications', () => {
    beforeEach(() => {
        MockRequests.clearAllMocks();
    });

    it('should configure URLs to mock in constructor and setter function', () => {
        expect(MockRequests.getResponse(mockUrl1)).toBe(undefined);

        MockRequests.configureDynamicResponses(dynamicConfig1);

        expect(MockRequests.getResponse(mockUrl1)).toEqual(dynamicConfig1[mockUrl1].response);
        expect(MockRequests.getResponse(mockUrl2)).toBe(undefined);

        MockRequests.deleteMockUrlResponse(mockUrl1);

        expect(MockRequests.getResponse(mockUrl1)).toBe(undefined);
        expect(MockRequests.getResponse(mockUrl2)).toBe(undefined);

        MockRequests.configureDynamicResponses(dynamicConfig1);
        MockRequests.setDynamicMockUrlResponse(mockUrl2, dynamicConfig2[mockUrl2]);

        expect(MockRequests.getResponse(mockUrl1)).toEqual(dynamicConfig1[mockUrl1].response);
        expect(MockRequests.getResponse(mockUrl2)).toEqual(dynamicConfig2[mockUrl2].response);
    });

    it('should be able to handle null response/dynamicResponseModFn entries', () => {
        MockRequests.configureDynamicResponses({
            [mockUrl1]: {}
        });
    });

    it('should have the ability to maintain previous configurations', () => {
        expect(MockRequests.getResponse(mockUrl1)).toBe(undefined);
        expect(MockRequests.getResponse(mockUrl2)).toBe(undefined);

        MockRequests.configureDynamicResponses(dynamicConfig1);
        MockRequests.configureDynamicResponses(dynamicConfig2, false);

        expect(MockRequests.getResponse(mockUrl1)).toEqual(dynamicConfig1[mockUrl1].response);
        expect(MockRequests.getResponse(mockUrl2)).toEqual(dynamicConfig2[mockUrl2].response);
    });

    it('should dynamically update the response object of fetch for URLs mocked without changing original config', async () => {
        const originalConfig = JSON.parse(JSON.stringify(dynamicConfig1[mockUrl1].response));

        MockRequests.configureDynamicResponses(dynamicConfig1);

        const mockPayloadRound1 = {
            addLettersArray: ['f', 'g'],
            valueModification: 5
        };
        const modifiedResponseRound1 = await fetch(mockUrl1, {
            body: JSON.stringify(mockPayloadRound1)
        }).then(res => res.json());
        const expectedResponseRound1 = {
            data: ['a', 'b', 'c', 'd', 'e', 'f', 'g'],
            value: 12
        };
        expect(modifiedResponseRound1).toEqual(expectedResponseRound1);

        const mockPayloadRound2 = {
            addLettersArray: ['h', 'i', 'j'],
            valueModification: -10
        };
        const modifiedResponseRound2 = await fetch(mockUrl1, {
            body: JSON.stringify(mockPayloadRound2)
        }).then(res => res.json());
        const expectedResponseRound2 = {
            data: ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j'],
            value: 2
        };
        expect(modifiedResponseRound2).toEqual(expectedResponseRound2);

        expect(dynamicConfig1[mockUrl1].response).toEqual(originalConfig);
    });

    it('should dynamically update the response object of XMLHttpRequest for URLs mocked without changing original config', async () => {
        const originalConfig = JSON.parse(JSON.stringify(dynamicConfig2[mockUrl2].response));

        const testDynamicXhrResponse = async (payload, expectedResult) => {
            return new Promise(resolve => {
                const mockXhr = new XMLHttpRequest();
                mockXhr.open('POST', mockUrl2);
                mockXhr.onreadystatechange = () => {
                    expect(mockXhr.response).toEqual(expectedResult);
                    resolve();
                };
                mockXhr.send(payload);
            });
        };

        MockRequests.configureDynamicResponses(dynamicConfig2);

        const mockPayload1 = {
            addObject: {
                id: 2,
                someData: 'my new data'
            }
        };
        const expectedResponse1 = {
            aggregateObjects: [
                { id: 1, value: 'Some value' },
                mockPayload1.addObject
            ]
        };

        const mockPayload2 = {
            removeId: 1,
            addObject: {
                id: 3,
                differentField: {
                    data: 'some other data'
                }
            }
        };
        const expectedResponse2 = {
            aggregateObjects: [
                mockPayload1.addObject,
                mockPayload2.addObject
            ]
        };

        await testDynamicXhrResponse(mockPayload1, expectedResponse1);
        await testDynamicXhrResponse(mockPayload2, expectedResponse2);

        expect(dynamicConfig2[mockUrl2].response).toEqual(originalConfig);
    });

    it('should parse request objects if they are JSON', async () => {
        MockRequests.configureDynamicResponses({
            [mockUrl1]: {
                dynamicResponseModFn: (request) => {
                    expect(typeof request).toEqual(typeof {});
                }
            },
            [mockUrl2]: {
                dynamicResponseModFn: (request) => {
                    expect(typeof request).toEqual(typeof '');
                }
            },
            [mockUrl3]: {
                dynamicResponseModFn: (request) => {
                    expect(request).toBe(undefined);
                }
            }
        });

        await fetch(mockUrl1, {
            body: JSON.stringify({})
        });
        await fetch(mockUrl2, {
            body: 'some other payload'
        });
        await fetch(mockUrl3);
    });

    it('should have the ability to overwrite dynamic responses with successive set/configure calls', async () => {
        MockRequests.configureDynamicResponses(dynamicConfig1);

        const mockPayloadRound1 = {
            addLettersArray: ['f', 'g'],
            valueModification: 5
        };
        const modifiedResponseRound1 = await fetch(mockUrl1, {
            body: JSON.stringify(mockPayloadRound1)
        }).then(res => res.json());
        const expectedResponseRound1 = {
            data: ['a', 'b', 'c', 'd', 'e', 'f', 'g'],
            value: 12
        };
        expect(modifiedResponseRound1).toEqual(expectedResponseRound1);

        const nowStaticResponse = 'now a static response';
        MockRequests.setDynamicMockUrlResponse(mockUrl1, { response: nowStaticResponse });
        const modifiedResponseRound2 = await fetch(mockUrl1, {
            body: 'some other type of payload'
        }).then(res => res.json());
        expect(modifiedResponseRound2).toEqual(nowStaticResponse);

        MockRequests.setDynamicMockUrlResponse(mockUrl1);
        const modifiedResponseRound3 = await fetch(mockUrl1, {
            body: 'some other type of payload'
        }).then(res => res.json());
        expect(modifiedResponseRound3).toEqual(null);
    });

    it('should save and use previous dynamic responses after each call', async () => {
        MockRequests.configureDynamicResponses(dynamicConfig1);

        const mockPayloadRound1 = {
            addLettersArray: ['f', 'g'],
            valueModification: 5
        };
        const modifiedResponseRound1 = await fetch(mockUrl1, {
            body: JSON.stringify(mockPayloadRound1)
        }).then(res => res.json());
        const expectedResponseRound1 = {
            data: ['a', 'b', 'c', 'd', 'e', 'f', 'g'],
            value: 12
        };
        expect(modifiedResponseRound1).toEqual(expectedResponseRound1);

        const mockPayloadRound2 = {
            addLettersArray: ['h', 'i'],
            valueModification: 3
        };
        const modifiedResponseRound2 = await fetch(mockUrl1, {
            body: JSON.stringify(mockPayloadRound2)
        }).then(res => res.json());
        const expectedResponseRound2 = {
            data: ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i'],
            value: 15
        };
        expect(modifiedResponseRound2).toEqual(expectedResponseRound2);
    });

    it('should have the ability to delay the resolution of the network call with fetch', async () => {
        MockRequests.configureDynamicResponses(dynamicConfigWithDelay);
        const { response, dynamicResponseModFn } =  dynamicConfigWithDelay[mockUrl1];
        let done = false;
        const responseBody = await fetch(mockUrl1).then(res => {
            done = true;
            return res.json();
        });
        const expectedModifiedResponse = dynamicResponseModFn(null, response);

        expect(setTimeout).toHaveBeenCalledWith(expect.anything(), dynamicConfigWithDelay[mockUrl1].delay);
        expect(responseBody).toEqual(expectedModifiedResponse);
        expect(done).toBe(true);
    });

    it('should have the ability to delay the resolution of the network call with XHR', async () => {
        const mockResponseConfig = dynamicConfigWithDelay[mockUrl1];
        MockRequests.setDynamicMockUrlResponse(mockUrl1, mockResponseConfig);
        const expectedModifiedResponse = mockResponseConfig.dynamicResponseModFn(null, mockResponseConfig.response);
        let done = false;

        const mockXhr = new XMLHttpRequest();
        mockXhr.open('POST', mockUrl1);
        mockXhr.onreadystatechange = () => {
            done = true;
            expect(mockXhr.response).toEqual(expectedModifiedResponse);
        };
        await mockXhr.send();

        expect(done).toBe(true);
        expect(setTimeout).toHaveBeenCalledWith(expect.anything(), dynamicConfigWithDelay[mockUrl1].delay);
    });

    it('should still function if xhr.onreadystatechange is not defined', () => {
        let resolved = false;

        MockRequests.setDynamicMockUrlResponse(mockUrl1, {
            dynamicResponseModFn: () => {
                resolved = true;
            }
        });

        const mockXhr = new XMLHttpRequest();
        mockXhr.open('GET', mockUrl1);
        mockXhr.send();

        expect(resolved).toBe(true);
    });

    it('should allow async dynamic response modification functions', async () => {
        async function testAsyncDynamicFuncWithNetworkCall(asyncNetworkCall) {
            MockRequests.clearAllMocks();
            let resolved = false;

            MockRequests.setDynamicMockUrlResponse(mockUrl1, {
                dynamicResponseModFn: async () => {
                    await Promise.resolve();
                    resolved = true;
                }
            });

            await asyncNetworkCall();

            expect(resolved).toBe(true);
        }

        await testAsyncDynamicFuncWithNetworkCall(async () => await fetch(mockUrl1));
        await testAsyncDynamicFuncWithNetworkCall(() => {
            return new Promise(resolve => {
                const mockXhr = new XMLHttpRequest();
                mockXhr.open('GET', mockUrl1);
                mockXhr.onreadystatechange = () => {
                    resolve();
                };
                mockXhr.send();
            });
        });
    });
});
